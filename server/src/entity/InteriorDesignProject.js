// ENTITY: InteriorDesignProject — current and completed designer projects.
const { DataTypes, Model, Op, col, fn, where } = require('sequelize');
const sequelize = require('../db');

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

  static listOwned({ designerAccountId, status, query }) {
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
              ? where(sequelize.cast(col(field), 'TEXT'), { [Op.like]: pattern })
              : where(fn('LOWER', col(field)), { [Op.like]: pattern })
          )),
        },
      ];
    }

    return InteriorDesignProject.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC'], ['id', 'DESC']],
      include: [{ association: 'images' }],
    });
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
