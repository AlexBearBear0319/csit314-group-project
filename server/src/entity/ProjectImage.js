// =============================================================================
// ENTITY: ProjectImage             (BCE: Entity layer)
// One photo of an interior design project. The photo file is in Supabase
// Storage. This row stores where it is (storagePath), its name, type, size, a
// text description for screen readers (altText), and its position (sortOrder).
//
// Table: project_image
// Used by the photo part of the designer's create and update stories
// (#20, #22, #25, #27) and by the customer's view stories (#33, #36).
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');
const IdpImageCleanupTask = require('./IdpImageCleanupTask');
const IdpImageUploadIntent = require('./IdpImageUploadIntent');

class ProjectImage extends Model {
  // READ one image of a project. Returns the row, or null.
  static async findImage(id, projectId) {
    return ProjectImage.findOne({ where: { id, projectId } });
  }

  // CREATE the image row from a finished upload, and delete the intent row.
  // Both happen in one transaction.
  //   intent   = the planned upload
  //   verified = { contentType, sizeBytes } read from the real file in storage
  // The new image goes last (sortOrder = number of photos the project has).
  static async createFromIntent({ projectId, intent, verified }) {
    return sequelize.transaction(async (transaction) => {
      const image = await ProjectImage.create({
        projectId,
        storagePath: intent.storagePath,
        fileName: intent.fileName,
        contentType: verified.contentType,
        sizeBytes: verified.sizeBytes,
        altText: intent.altText,
        sortOrder: await ProjectImage.count({ where: { projectId }, transaction }),
      }, { transaction });
      await IdpImageUploadIntent.deleteIntent(intent, transaction);
      return image;
    });
  }

  // UPDATE the description and/or position of an image.
  static async updateImage(image, updates) {
    return image.update(updates);
  }

  // DELETE an image row, and queue its file for removal from storage, in one
  // transaction. Returns the deleted image, or null if there is no such image.
  static async deleteImage({ id, projectId, designerAccountId }) {
    return sequelize.transaction(async (transaction) => {
      const image = await ProjectImage.findOne({
        where: { id, projectId },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!image) return null;
      await IdpImageCleanupTask.queue([image.storagePath], designerAccountId, transaction);
      await image.destroy({ transaction });
      return image;
    });
  }
}

ProjectImage.init(
  {
    projectId: { type: DataTypes.INTEGER, allowNull: false, field: 'project_id' },
    storagePath: { type: DataTypes.STRING(512), allowNull: false, unique: true, field: 'storage_path' },
    fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
    contentType: { type: DataTypes.STRING(80), allowNull: false, field: 'content_type' },
    sizeBytes: { type: DataTypes.INTEGER, allowNull: false, field: 'size_bytes' },
    altText: { type: DataTypes.STRING(240), allowNull: false, field: 'alt_text' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  },
  {
    sequelize,
    modelName: 'ProjectImage',
    tableName: 'project_image',
    underscored: true,
    indexes: [{ fields: ['project_id', 'sort_order'] }],
  }
);

module.exports = ProjectImage;
