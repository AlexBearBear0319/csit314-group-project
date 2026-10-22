// ENTITY: UserAccount — ONE person's login, linked to one UserProfile (role).
// Only entity classes talk to the database.
const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../db');
const UserProfile = require('./UserProfile');

class UserAccount extends Model {
  // Story: Login (#11, #18, #37, #47)
  // Checks the user ID, password and selected profile.
  // Returns { account } on success, or { error, reason } on failure.
  // reason is 'invalid' | 'account-suspended' | 'profile-suspended'.
  static async login(username, password, profileName) {
    const account = await UserAccount.findOne({
      where: { username },
      include: UserProfile,
    });

    // Same message for every wrong-detail case, so attackers can't tell
    // which part was wrong.
    const invalid = { error: 'Wrong user ID, password or user profile.', reason: 'invalid' };
    if (!account) return invalid;

    const passwordOk = await bcrypt.compare(password, account.password);
    if (!passwordOk) return invalid;
    if (account.UserProfile.name !== profileName) return invalid;

    if (account.status === 'suspended') {
      return { error: 'This account is suspended.', reason: 'account-suspended' };
    }
    if (account.UserProfile.status === 'suspended') {
      return { error: 'This user profile is suspended.', reason: 'profile-suspended' };
    }

    // Never send the password hash back
    return {
      account: {
        id: account.id,
        username: account.username,
        name: account.name,
        profile: account.UserProfile.name,
      },
    };
  }
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
