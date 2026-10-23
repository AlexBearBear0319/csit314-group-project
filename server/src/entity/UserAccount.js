// ENTITY: UserAccount — ONE person's login, linked to one UserProfile (role).
// Only entity classes talk to the database.
const { DataTypes, Model, col, fn, where } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../db');
const UserProfile = require('./UserProfile');

class UserAccount extends Model {
  // Story: Login (#11, #18, #37, #47)
  // Checks the user ID and password, then reads the role from the linked profile.
  // Returns { account } on success, or { error, reason } on failure.
  static async login(username, password) {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const matchingAccounts = await UserAccount.findAll({
      where: where(fn('LOWER', fn('TRIM', col('username'))), normalizedUsername),
      include: [{ model: UserProfile }],
    });

    // Same message for every wrong-detail case, so attackers can't tell
    // which part was wrong.
    const invalid = { error: 'Wrong user ID or password.', reason: 'invalid' };
    if (matchingAccounts.length !== 1 || typeof password !== 'string') return invalid;
    const account = matchingAccounts[0];

    // Manually imported plain-text passwords are not accepted. Reset them with
    // the account provisioning tool so the stored value is a bcrypt hash.
    const isBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(account.password);
    if (!isBcryptHash) return invalid;
    const passwordOk = await bcrypt.compare(password, account.password);
    if (!passwordOk) return invalid;

    if (account.status !== 'active') {
      return { error: 'This account is suspended.', reason: 'account-suspended' };
    }
    const profile = account.UserProfile;
    if (!profile) {
      return { error: 'Your account role is not set. Contact an administrator.', reason: 'profile-missing' };
    }
    if (profile.status !== 'active') {
      return { error: 'This user profile is suspended.', reason: 'profile-suspended' };
    }

    const role = canonicalRole(profile.name);
    if (!role) {
      return { error: 'Your account role is not recognized. Contact an administrator.', reason: 'profile-unrecognized' };
    }

    // Never send the password hash back
    return {
      account: {
        id: account.id,
        username: account.username,
        name: account.name,
        email: account.email,
        photo: account.photo,
        role,
      },
    };
  }
}

function canonicalRole(name) {
  const roles = {
    'user admin': 'User Admin',
    'interior designer': 'Interior Designer',
    customer: 'Customer',
    'platform manager': 'Platform Manager',
  };
  return roles[String(name || '').trim().toLowerCase()] || null;
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
  {
    sequelize,
    modelName: 'UserAccount',
    tableName: 'user_account',
  }
);

// Each account belongs to exactly one profile (role)
UserProfile.hasMany(UserAccount, { foreignKey: { name: 'profileId', allowNull: false } });
UserAccount.belongsTo(UserProfile, { foreignKey: { name: 'profileId', allowNull: false } });

module.exports = UserAccount;
module.exports.canonicalRole = canonicalRole;
