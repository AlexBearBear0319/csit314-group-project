// ENTITY: UserAccount — ONE person's login, linked to one UserProfile (role).
// Only entity classes talk to the database.
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');
const UserProfile = require('./UserProfile');

class UserAccount extends Model {
  // Entity methods for user stories go here, e.g.
  // static async suspendAccount(id) { ... }   <- story: Suspend User Account
  // static async login(username, password, profileId) { ... }
}

UserAccount.init(
  {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }, // stored HASHED with bcrypt, never plain text
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    dob: { type: DataTypes.DATEONLY },
    photo: { type: DataTypes.STRING }, // image URL
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' }, // active | suspended
  },
  { sequelize, modelName: 'UserAccount', tableName: 'user_account' }
);

// Each account belongs to exactly one profile (role)
UserProfile.hasMany(UserAccount, { foreignKey: { name: 'profileId', allowNull: false } });
UserAccount.belongsTo(UserProfile, { foreignKey: { name: 'profileId', allowNull: false } });

module.exports = UserAccount;
