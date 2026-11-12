// BCE: Entity.
// Defines the company model and the fields persisted for a designer company.

// =============================================================================
// ENTITY: Company                (BCE: Entity layer)
// The company information of one Interior Designer (stories #13-17).
// One designer owns at most one company row (designer_account_id is unique).
//
// Table: company (name, description, designer_account_id)
//
// This class only does CRUD on its own table. The controllers decide the
// rules (for example "you can only have one company") and call these methods.
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class Company extends Model {
  // CREATE (story #13). values = { name, description, designerAccountId }.
  static async createCompany(values) {
    return this.create(values);
  }

  // READ (story #14, and used by the other stories to find the designer's company).
  // Returns the designer's company, or null if they have not created one.
  static async viewCompany(designerAccountId) {
    return this.findOne({ where: { designerAccountId } });
  }

  // UPDATE (story #15). Returns the updated company, or null if not found.
  static async updateCompany(designerAccountId, values) {
    const company = await this.findOne({ where: { designerAccountId } });
    return company ? company.update(values) : null;
  }

  // DELETE (story #16). Returns how many rows were deleted (1 or 0).
  static async deleteCompany(designerAccountId) {
    return this.destroy({ where: { designerAccountId } });
  }

  // SEARCH (story #17).
  // Returns a list with the designer's company if its name or description
  // contains the keyword (capital letters ignored), otherwise an empty list.
  static async searchCompany(designerAccountId, keyword) {
    const company = await this.findOne({ where: { designerAccountId } });
    const term = keyword.trim().toLowerCase();
    const matches = company && [company.name, company.description]
      .some((value) => value.toLowerCase().includes(term));
    return matches ? [company] : [];
  }
}

Company.init({
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  designerAccountId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'designer_account_id' },
}, { sequelize, modelName: 'Company', tableName: 'company', underscored: true });

// Expose this module’s entry points to its callers.
module.exports = Company;
