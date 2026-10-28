// ENTITY: UserProfile — a ROLE / user type (User Admin, Interior Designer,
// Customer, Platform Manager). Only entity classes talk to the database.
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class UserProfile extends Model {
  static async createProfile(name, description) {
    return this.create({ name, description });
  }

  static async viewProfile(id) {
    return this.findByPk(id);
  }

  static async updateProfile(id, name, description) {
    const profile = await this.findByPk(id);
    return profile ? profile.update({ name, description }) : null;
  }

  static async suspendProfile(id) {
    const profile = await this.findByPk(id);
    return profile ? profile.update({ status: 'suspended' }) : null;
  }

  static async activateProfile(id) {
    const profile = await this.findByPk(id);
    return profile ? profile.update({ status: 'active' }) : null;
  }

  static async searchProfiles(keyword = '') {
    const profiles = await this.findAll({ order: [['name', 'ASC'], ['id', 'ASC']] });
    const term = keyword.trim().toLowerCase();
    // Role lists are small. Literal matching keeps wildcard and case behaviour
    // identical in the SQLite tests and PostgreSQL production database.
    return profiles.filter((profile) =>
      profile.name.toLowerCase().includes(term) ||
      (profile.description || '').toLowerCase().includes(term));
  }
}

UserProfile.init(
  {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' }, // active | suspended
  },
  { sequelize, modelName: 'UserProfile', tableName: 'user_profile' }
);

module.exports = UserProfile;
