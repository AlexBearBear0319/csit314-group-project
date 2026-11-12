// =============================================================================
// ENTITY: UserAccount            (BCE: Entity layer)
// One person's login. Each account is linked to exactly one UserProfile (role).
//
// Table: user_account (username, password, name, email, dob, photo, status,
//        profileId)
//
// Stories that use this entity:
//   #6-10   the User Admin creates, views, updates, suspends, searches accounts
//   #11 #18 #37 #47   login (UserLoginC reads the account with findForLogin)
//   sign-up (RegisterAccountC)
//
// This class only does CRUD on its own table. It does not decide what is
// allowed. The controllers check the rules first, hash the password, and then
// call the methods below. That is why every password arriving here is already
// a bcrypt hash.
// =============================================================================

const { DataTypes, Model, Op, UniqueConstraintError, ValidationError, col, fn, where } = require('sequelize');
const sequelize = require('../db');
const UserProfile = require('./UserProfile');
const UserSession = require('./UserSession');

class UserAccount extends Model {
  // ---------------------------------------------------------------------------
  // HELPER: publicFields
  // Builds a SAFE copy of an account for the browser. The password hash is left
  // out on purpose, so it can never leak.
  // account = one row loaded together with its profile.
  // ---------------------------------------------------------------------------
  static publicFields(account) {
    return {
      id: account.id,
      username: account.username,
      name: account.name,
      email: account.email,
      dob: account.dob || null, // send null, not undefined, when empty
      photo: account.photo || null,
      status: account.status, // 'active' or 'suspended'
      profileId: account.profileId,
      profileName: account.UserProfile ? account.UserProfile.name : null,
    };
  }

  // ---------------------------------------------------------------------------
  // READ with profile (used inside this class)
  // SQL: SELECT * FROM user_account JOIN user_profile WHERE user_account.id = ?
  // ---------------------------------------------------------------------------
  static async findWithProfile(id) {
    return UserAccount.findByPk(id, { include: UserProfile });
  }

  // ---------------------------------------------------------------------------
  // READ for login (stories #11, #18, #37, #47)
  // Finds the accounts whose user ID matches, ignoring capitals and spaces at
  // the ends. UserLoginC decides what to do with the answer: it checks the
  // password, the account status and the profile.
  // Returns a list (normally 0 or 1 account) with the profile loaded.
  // ---------------------------------------------------------------------------
  static async findForLogin(username) {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    return UserAccount.findAll({
      where: where(fn('LOWER', fn('TRIM', col('username'))), normalizedUsername),
      include: [{ model: UserProfile }],
    });
  }

  // ---------------------------------------------------------------------------
  // READ duplicates (used by stories #6 and #8 and by sign-up)
  // Checks whether another account already uses this user ID or email.
  //   { username, email } = either one may be missing
  //   ignoreId            = when updating, skip the account we are editing
  // Returns { username: '...', email: '...' } with only the clashes, or {}.
  // ---------------------------------------------------------------------------
  static async findDuplicates({ username, email }, ignoreId = null) {
    const errors = {};
    const notSelf = ignoreId ? { id: { [Op.ne]: ignoreId } } : {};

    if (username) {
      // LOWER + TRIM so "Sam.Test " counts as "sam.test", which matters for
      // accounts that were added by hand before our rules existed.
      const taken = await UserAccount.findOne({
        where: { [Op.and]: [where(fn('LOWER', fn('TRIM', col('username'))), username), notSelf] },
      });
      if (taken) errors.username = 'This user ID is already in use.';
    }

    if (email) {
      const taken = await UserAccount.findOne({
        where: { [Op.and]: [where(fn('LOWER', fn('TRIM', col('email'))), email), notSelf] },
      });
      if (taken) errors.email = 'This email is already in use.';
    }
    return errors;
  }

  // ---------------------------------------------------------------------------
  // CREATE (story #6)
  // values = checked fields from CreateUserAccountC. values.password is
  //          already hashed by the controller.
  // Returns the new account's safe fields (with profileName).
  // SQL: INSERT INTO user_account (...) VALUES (...)
  // ---------------------------------------------------------------------------
  static async createAccount(values) {
    const created = await UserAccount.create(values);
    return UserAccount.publicFields(await UserAccount.findWithProfile(created.id));
  }

  // ---------------------------------------------------------------------------
  // CREATE with a login session (sign-up)
  // Saves the account and its first session in ONE transaction. If the session
  // cannot be saved, the account is not saved either, so no half-made account
  // is left behind.
  // values = account fields (password already hashed)
  // sessionValues = { tokenHash, csrfToken, expiresAt }
  // Returns the saved account row.
  // ---------------------------------------------------------------------------
  static async createAccountWithSession(values, sessionValues) {
    return sequelize.transaction(async (transaction) => {
      const account = await UserAccount.create(values, { transaction });
      await UserSession.create({ ...sessionValues, accountId: account.id }, { transaction });
      return account;
    });
  }

  // True when a save failed because the user ID or email was taken at the same
  // moment by someone else. The sign-up controller uses it to reply 409.
  static isConflictError(error) {
    return error instanceof UniqueConstraintError || error instanceof ValidationError;
  }

  // ---------------------------------------------------------------------------
  // READ one (story #7)
  // Returns the account's safe fields, or null if no account has this ID.
  // ---------------------------------------------------------------------------
  static async viewAccount(id) {
    const account = await UserAccount.findWithProfile(id);
    return account ? UserAccount.publicFields(account) : null;
  }

  // ---------------------------------------------------------------------------
  // UPDATE (story #8, also reactivating a suspended account)
  // values = only the fields to change, already checked by UpdateUserAccountC.
  //          If values.password is there, it is already hashed.
  // Returns the updated account's safe fields, or null if no account has this ID.
  // SQL: UPDATE user_account SET ... WHERE id = ?
  // ---------------------------------------------------------------------------
  static async updateAccount(id, values) {
    const account = await UserAccount.findByPk(id);
    if (!account) return null;
    await account.update(values);
    return UserAccount.publicFields(await UserAccount.findWithProfile(account.id));
  }

  // ---------------------------------------------------------------------------
  // UPDATE status (story #9)
  // Sets status to 'suspended'. Login and every later request refuse accounts
  // that are not 'active', so the user is blocked from then on.
  // Returns the account's safe fields, or null if no account has this ID.
  // ---------------------------------------------------------------------------
  static async suspendAccount(id) {
    const account = await UserAccount.findByPk(id);
    if (!account) return null;
    await account.update({ status: 'suspended' });
    return UserAccount.publicFields(await UserAccount.findWithProfile(account.id));
  }

  // ---------------------------------------------------------------------------
  // SEARCH (story #10)
  // Finds accounts whose user ID, name or email contains the keyword (capital
  // letters ignored). An empty keyword lists every account, newest first.
  // ---------------------------------------------------------------------------
  static async searchAccounts(keyword) {
    const text = String(keyword || '').trim().toLowerCase();
    const options = { include: UserProfile, order: [['id', 'DESC']] };

    if (text) {
      // % means "any characters" in SQL LIKE. '%sam%' matches anything containing "sam".
      const pattern = `%${text}%`;
      // 'UserAccount.' tells the database which table we mean, because the
      // joined user_profile table also has a "name" column.
      options.where = {
        [Op.or]: ['username', 'name', 'email'].map((field) =>
          where(fn('LOWER', col(`UserAccount.${field}`)), { [Op.like]: pattern })),
      };
    }

    const accounts = await UserAccount.findAll(options);
    return accounts.map((account) => UserAccount.publicFields(account));
  }
}

// -----------------------------------------------------------------------------
// TABLE DEFINITION
// Sequelize also adds id, createdAt and updatedAt automatically.
// -----------------------------------------------------------------------------
UserAccount.init(
  {
    username: { type: DataTypes.STRING, allowNull: false, unique: true }, // the login user ID
    password: { type: DataTypes.STRING, allowNull: false }, // stored HASHED with bcrypt, never plain text
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    dob: { type: DataTypes.DATEONLY }, // date of birth, optional
    photo: { type: DataTypes.STRING }, // image URL, optional
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' }, // active | suspended
  },
  { sequelize, modelName: 'UserAccount', tableName: 'user_account' }
);

// Each account belongs to exactly one profile (role). This adds a profileId
// column to user_account and lets us load the profile with { include: UserProfile }.
UserProfile.hasMany(UserAccount, { foreignKey: { name: 'profileId', allowNull: false } });
UserAccount.belongsTo(UserProfile, { foreignKey: { name: 'profileId', allowNull: false } });

module.exports = UserAccount;
