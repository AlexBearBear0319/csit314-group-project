// ENTITY: InteriorDesignProject — current and completed designer projects.
const { DataTypes, Model, Op, col, fn, where } = require('sequelize');
const sequelize = require('../db');
const ProjectImage = require('./ProjectImage');

const IDP_PAGE_SIZE = 9;

class InteriorDesignProject extends Model {
  static createOwned(values) {
    return InteriorDesignProject.create(values);
  }

  static findOwned({ id, designerAccountId, status, include = [], transaction }) {
    return InteriorDesignProject.findOne({
      where: { id, designerAccountId, status },
      include,
      transaction,
    });
  }

  static async listOwned({ designerAccountId, status, query, page = 1 }) {
    const whereClause = { designerAccountId, status };
    const term = String(query || '').trim().toLowerCase();

    if (term) {
      const escaped = term.replace(/[\\%_]/g, '\\$&');
      const pattern = `%${escaped}%`;
      const fields = ['name', 'propertyType', 'designStyle'];
      if (status === 'past') fields.push('completionDate');
      whereClause[Op.and] = [
        {
          [Op.or]: fields.map((field) => (
            field === 'completionDate'
              ? where(sequelize.cast(col('completion_date'), 'TEXT'), { [Op.like]: pattern })
              : where(fn('LOWER', col({ propertyType: 'property_type', designStyle: 'design_style' }[field] || field)), { [Op.like]: pattern })
          )),
        },
      ];
    }

    const { count, rows } = await InteriorDesignProject.findAndCountAll({
      where: whereClause,
      order: [['updatedAt', 'DESC'], ['id', 'DESC']],
      limit: IDP_PAGE_SIZE,
      offset: (page - 1) * IDP_PAGE_SIZE,
    });

    const projectIds = rows.map((project) => project.id);
    const imageRows = projectIds.length
      ? await ProjectImage.findAll({
        attributes: ['id', 'projectId', 'storagePath', 'fileName', 'contentType', 'sizeBytes', 'altText', 'sortOrder'],
        where: { projectId: projectIds },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      })
      : [];
    const imagesByProject = new Map();
    for (const image of imageRows) {
      const projectImages = imagesByProject.get(image.projectId) || [];
      projectImages.push(image);
      imagesByProject.set(image.projectId, projectImages);
    }

    return {
      total: count,
      projects: rows.map((project) => {
        const images = imagesByProject.get(project.id) || [];
        return {
          ...project.get({ plain: true }),
          imageCount: images.length,
          previewImages: images.slice(0, 3),
        };
      }),
    };
  }
}

InteriorDesignProject.init(
  {
    name: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    propertyType: { type: DataTypes.STRING(80), allowNull: true, field: 'property_type' },
    designStyle: { type: DataTypes.STRING(80), allowNull: true, field: 'design_style' },
    status: { type: DataTypes.STRING(16), allowNull: false },
    completionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'completion_date' },
    designerAccountId: { type: DataTypes.INTEGER, allowNull: false, field: 'designer_account_id' },
  },
  {
    sequelize,
    modelName: 'InteriorDesignProject',
    tableName: 'interior_design_project',
    underscored: true,
    indexes: [
      { fields: ['designer_account_id', 'status', 'updated_at'] },
      { fields: ['designer_account_id', 'status', 'completion_date'] },
      { fields: ['designer_account_id', 'status', 'name'] },
    ],
  }
);

module.exports = InteriorDesignProject;
module.exports.IDP_PAGE_SIZE = IDP_PAGE_SIZE;
