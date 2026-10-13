// ENTITY: UserProfile — a ROLE / user type (User Admin, Interior Designer,
// Customer, Platform Manager). Only entity classes talk to the database.
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class UserProfile extends Model {
  // Entity methods for user stories go here, e.g.
  // static async createProfile(name, description) { ... }
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
