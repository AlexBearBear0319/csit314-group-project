const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

// Stories #39–43. Project associations belong in the IDP model; reference this
// category's stable ID and use ON DELETE RESTRICT to preserve linked projects.
class IDPCategory extends Model {
  static async createCategory(name, description) {
    return this.create({ name, description });
  }

  static async viewCategory(id) {
    return this.findByPk(id);
  }

  static async updateCategory(id, name, description) {
    const category = await this.findByPk(id);
    return category ? category.update({ name, description }) : null;
  }

  static async deleteCategory(id) {
    return this.destroy({ where: { id } });
  }

  static async searchCategories(keyword = '') {
    const categories = await this.findAll({ order: [['name', 'ASC'], ['id', 'ASC']] });
    const term = keyword.trim().toLowerCase();
    // Literal matching keeps % and _ as user text in both SQLite and Postgres.
    return categories.filter((category) =>
      category.name.toLowerCase().includes(term) ||
      (category.description || '').toLowerCase().includes(term));
  }
}

IDPCategory.init({
  name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
}, { sequelize, modelName: 'IDPCategory', tableName: 'idp_category' });

module.exports = IDPCategory;
