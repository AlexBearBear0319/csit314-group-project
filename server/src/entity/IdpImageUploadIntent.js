// ENTITY: IdpImageUploadIntent — tracks a signed upload until metadata saves.
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class IdpImageUploadIntent extends Model {}

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
