// =============================================================================
// ENTITY: IDPCategory            (BCE: Entity layer)
// A category groups interior design projects (for example "Modern").
// Stories #39-43: the Platform Manager creates, views, updates, deletes and
// searches categories.
//
// Table: idp_category (name, description)
//
// This class only does CRUD on its own table. The controllers decide what is
// allowed (for example "a category that projects still use cannot be deleted")
// and then call these methods.
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class IDPCategory extends Model {
  // CREATE (story #39). Returns the saved category.
  static async createCategory(name, description) {
    return this.create({ name, description });
  }

  // READ one (story #40, also used by other stories to check a category exists).
  // Returns the category, or null if no category has this ID.
  static async viewCategory(id) {
    return this.findByPk(id);
  }

  // READ by name (the controller uses it to stop two categories sharing a name).
  // ignoreId = when updating, skip the category we are editing.
  static async findByName(name, ignoreId = null) {
    const category = await this.findOne({ where: { name } });
    return category && category.id !== ignoreId ? category : null;
  }

  // READ all names (the dropdown on the designer's project form).
  static async listOptions() {
    return this.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
  }

  // READ how many projects use this category.
  // The projects table is read through the link we set up in entity/index.js.
  static async countProjects(id) {
    const category = await this.findByPk(id);
    return category ? category.countProjects() : 0;
  }

  // UPDATE (story #41). Returns the updated category, or null if not found.
  static async updateCategory(id, name, description) {
    const category = await this.findByPk(id);
    return category ? category.update({ name, description }) : null;
  }

  // DELETE (story #42). Returns how many rows were deleted (1 or 0).
  static async deleteCategory(id) {
    return this.destroy({ where: { id } });
  }

  // SEARCH (story #43). Name or description contains the keyword, newest first.
  static async searchCategories(keyword = '') {
    const categories = await this.findAll({ order: [['id', 'DESC']] });
    const term = keyword.trim().toLowerCase();
    // We match in JavaScript so % and _ stay plain text in SQLite and PostgreSQL.
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
