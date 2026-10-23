// ENTITY: IdpImageCleanupTask — retry queue for objects that could not be
// removed from Storage after a project or image change.
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class IdpImageCleanupTask extends Model {}

IdpImageCleanupTask.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    designerAccountId: { type: DataTypes.INTEGER, allowNull: false, field: 'designer_account_id' },
    storagePath: { type: DataTypes.STRING(512), allowNull: false, unique: true, field: 'storage_path' },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastError: { type: DataTypes.STRING(500), allowNull: true, field: 'last_error' },
  },
  {
    sequelize,
    modelName: 'IdpImageCleanupTask',
    tableName: 'idp_image_cleanup_task',
    underscored: true,
    indexes: [{ fields: ['created_at'] }],
  }
);

module.exports = IdpImageCleanupTask;
