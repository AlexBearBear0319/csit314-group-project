// =============================================================================
// ENTITY: IdpImageUploadIntent     (BCE: Entity layer)
// A photo upload that has been planned but not finished yet.
//
// How a photo upload works (stories #20, #22, #25, #27):
//   1. the page asks for an upload link        -> we save an "intent" row here
//   2. the page sends the file to Storage
//   3. the page says "done"                    -> we check the file, make a
//      ProjectImage row, and delete the intent
// The intent row lets us check that the file really matches what was planned
// (type and size), and that only its owner can finish it.
//
// Table: idp_image_upload_intent (projectId, designerAccountId, storagePath,
//        fileName, contentType, sizeBytes, altText, expiresAt)
// =============================================================================

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../db');
const IdpImageCleanupTask = require('./IdpImageCleanupTask');

class IdpImageUploadIntent extends Model {
  // CREATE the intent row. Returns the saved row.
  static async createIntent(values) {
    return IdpImageUploadIntent.create(values);
  }

  // READ an intent that belongs to this designer and project and has not expired.
  // Returns the row, or null.
  static async findActive({ id, projectId, designerAccountId }) {
    return IdpImageUploadIntent.findOne({
      where: { id, projectId, designerAccountId, expiresAt: { [Op.gt]: new Date() } },
    });
  }

  // DELETE one intent row. transaction = optional.
  static async deleteIntent(intent, transaction) {
    return intent.destroy({ transaction });
  }

  // DELETE (cancel) an intent, and queue its file for removal from storage.
  // Both happen in one transaction, so we never lose track of the file.
  // Returns the deleted intent, or null if there is no such intent.
  static async cancelIntent({ id, projectId, designerAccountId }) {
    return sequelize.transaction(async (transaction) => {
      const intent = await IdpImageUploadIntent.findOne({
        where: { id, projectId, designerAccountId },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!intent) return null;
      await IdpImageCleanupTask.queue([intent.storagePath], designerAccountId, transaction);
      await intent.destroy({ transaction });
      return intent;
    });
  }
}

IdpImageUploadIntent.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    projectId: { type: DataTypes.INTEGER, allowNull: false, field: 'project_id' },
    designerAccountId: { type: DataTypes.INTEGER, allowNull: false, field: 'designer_account_id' },
    storagePath: { type: DataTypes.STRING(512), allowNull: false, unique: true, field: 'storage_path' },
    fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
    contentType: { type: DataTypes.STRING(80), allowNull: false, field: 'content_type' },
    sizeBytes: { type: DataTypes.INTEGER, allowNull: false, field: 'size_bytes' },
    altText: { type: DataTypes.STRING(240), allowNull: false, field: 'alt_text' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  },
  {
    sequelize,
    modelName: 'IdpImageUploadIntent',
    tableName: 'idp_image_upload_intent',
    underscored: true,
    indexes: [{ fields: ['designer_account_id', 'expires_at'] }],
  }
);

module.exports = IdpImageUploadIntent;
