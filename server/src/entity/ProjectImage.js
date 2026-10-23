// ENTITY: ProjectImage — metadata for one durable image in Supabase Storage.
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class ProjectImage extends Model {}

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
