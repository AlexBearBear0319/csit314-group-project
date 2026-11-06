const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');
class Company extends Model {
  static findOwned(accountId) { return this.findOne({ where: { designerAccountId: accountId } }); }
  static async searchOwned(accountId, keyword) {
    const company = await this.findOwned(accountId);
    const term = keyword.trim().toLowerCase();
    return company && [company.name, company.description].some(value => value.toLowerCase().includes(term)) ? [company] : [];
  }
}
Company.init({
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  designerAccountId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'designer_account_id' },
}, { sequelize, modelName: 'Company', tableName: 'company', underscored: true });
module.exports = Company;
