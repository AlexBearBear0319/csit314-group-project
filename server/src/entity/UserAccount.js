// ENTITY: UserAccount — ONE person's login, linked to one UserProfile (role).
// Only entity classes talk to the database.
const { DataTypes, Model, Op, col, fn, where } = require('sequelize');
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

  // ===========================================================================
  // User Admin: user account stories #6-10
  //
  // These methods are the ENTITY layer of BCE: the only code that reads or
  // writes the user_account table. Controllers (CreateUserAccountC etc.) check
  // the input first, then call these.
  //
  // "static" means you call the method on the class itself, e.g.
  // UserAccount.viewAccount(5), without making an object first.
  //
  // "extends Model" (at the top of the class) gives UserAccount Sequelize's
  // database methods: findByPk, findOne, findAll, create, update. Sequelize
  // turns these into SQL for us.
  // ===========================================================================

  // Builds a SAFE copy of an account to send to the browser.
  // The password hash is deliberately left out, so it can never leak.
  // profileName comes from the linked UserProfile row (loaded with "include").
  static publicFields(account) {
    return {
      id: account.id,
      username: account.username,
      name: account.name,
      email: account.email,
      dob: account.dob || null, // || null: send null rather than undefined if empty
      photo: account.photo || null,
      status: account.status, // 'active' or 'suspended'
      profileId: account.profileId,
      // a ? b : c means: if a then b, else c. Guards against a missing profile.
      profileName: account.UserProfile ? account.UserProfile.name : null,
    };
  }

  // Finds one account by its ID AND loads its profile in the same query.
  // SQL: SELECT * FROM user_account JOIN user_profile ... WHERE user_account.id = ?
  // Returns the row, or null if there is none.
  static async findWithProfile(id) {
    return UserAccount.findByPk(id, { include: UserProfile });
  }

  // Checks whether another account already uses this user ID or email.
  //   { username, email } = "destructuring": takes those two fields out of the
  //                         object passed in. Either may be missing.
  //   ignoreId            = when updating, skip the account being updated, so
  //                         saving your own unchanged email is not a "conflict".
  // Returns e.g. { username: 'This user ID is already in use.' }, or {} if all clear.
  static async findDuplicates({ username, email }, ignoreId = null) {
    const errors = {};

    // Extra condition "id is not ignoreId". Op.ne = "not equal". When there
    // is no ignoreId (Create), use {} which means "no extra condition".
    const notSelf = ignoreId ? { id: { [Op.ne]: ignoreId } } : {};

    if (username) {
      // SQL: WHERE LOWER(TRIM(username)) = 'kaz.test' AND id <> ignoreId
      // LOWER + TRIM so "Kaz.Test " counts as the same as "kaz.test",
      // which matters for accounts added by hand before the rules existed.
      const taken = await UserAccount.findOne({
        where: { [Op.and]: [where(fn('LOWER', fn('TRIM', col('username'))), username), notSelf] },
      });
      if (taken) errors.username = 'This user ID is already in use.';
    }

    if (email) {
      // Same check for email.
      const taken = await UserAccount.findOne({
        where: { [Op.and]: [where(fn('LOWER', fn('TRIM', col('email'))), email), notSelf] },
      });
      if (taken) errors.email = 'This email is already in use.';
    }

    return errors;
  }

  // ---------------------------------------------------------------------------
  // Story #6 (part): the profiles a User Admin can give an account.
  // The Create and Update forms show these in a dropdown. Suspended profiles
  // are left out, because nobody with a suspended profile can log in.
  // Returns e.g. [{ id: 3, name: 'Customer' }, ...], sorted A-Z by name.
  // SQL: SELECT id, name FROM user_profile WHERE status = 'active' ORDER BY name
  // ---------------------------------------------------------------------------
  static async profileOptions() {
    const profiles = await UserProfile.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name'], // only read the 2 columns we need
      order: [['name', 'ASC']],
    });
    // Turn each database row into a plain { id, name } object.
    return profiles.map((profile) => ({ id: profile.id, name: profile.name }));
  }

  // ---------------------------------------------------------------------------
  // Story #6: Create user account.
  // values = checked fields from CreateUserAccountC. values.password is still
  //          plain text here; it is scrambled (hashed) before saving.
  // Returns { account } when saved, or { conflict: {...} } when the user ID
  // or email is already in use.
  // ---------------------------------------------------------------------------
  static async createAccount(values) {
    // 1. Stop if the user ID or email is taken.
    //    Object.keys(x).length = how many entries x has. 0 means no conflicts.
    const conflict = await UserAccount.findDuplicates(values);
    if (Object.keys(conflict).length) return { conflict };

    // 2. Hash the password. 10 is the "cost": how much work bcrypt does.
    //    Higher is slower to crack. Login uses bcrypt.compare to check it later.
    const password = await bcrypt.hash(values.password, 10);

    // 3. Save the new row. { ...values, password } copies every field from
    //    values, then replaces password with the hashed one.
    //    SQL: INSERT INTO user_account (...) VALUES (...)
    const created = await UserAccount.create({ ...values, password });

    // 4. Read it back with its profile, so the reply includes profileName,
    //    and send only the safe fields.
    return { account: UserAccount.publicFields(await UserAccount.findWithProfile(created.id)) };
  }

  // ---------------------------------------------------------------------------
  // Story #7: View user account.
  // Returns the account's safe fields, or null if no account has this ID.
  // ---------------------------------------------------------------------------
  static async viewAccount(id) {
    const account = await UserAccount.findWithProfile(id);
    return account ? UserAccount.publicFields(account) : null;
  }

  // ---------------------------------------------------------------------------
  // Story #8: Update user account.
  // values = only the fields to change (already checked by UpdateUserAccountC).
  //          values.status can only be 'active' (reactivate a suspended account).
  // Returns { account } when saved, { conflict } when the new user ID or email
  // belongs to another account, or null when no account has this ID.
  // ---------------------------------------------------------------------------
  static async updateAccount(id, values) {
    // 1. Find the account. findByPk = find by primary key (the ID).
    const account = await UserAccount.findByPk(id);
    if (!account) return null;

    // 2. Check duplicates, ignoring this account itself.
    const conflict = await UserAccount.findDuplicates(values, account.id);
    if (Object.keys(conflict).length) return { conflict };

    // 3. Copy the changes. If a new password was sent, hash it first.
    //    Never store a plain-text password.
    const changes = { ...values };
    if (changes.password) changes.password = await bcrypt.hash(changes.password, 10);

    // 4. Save only the changed fields.
    //    SQL: UPDATE user_account SET name = ?, ... WHERE id = ?
    await account.update(changes);

    // 5. Read it back with its profile (the profile may have changed).
    return { account: UserAccount.publicFields(await UserAccount.findWithProfile(account.id)) };
  }

  // ---------------------------------------------------------------------------
  // Story #9: Suspend user account.
  // Sets status to 'suspended'. login() and authenticateSession both refuse
  // suspended accounts, so the user is blocked from then on.
  // Returns the account's safe fields, or null if no account has this ID.
  // ---------------------------------------------------------------------------
  static async suspendAccount(id) {
    const account = await UserAccount.findByPk(id);
    if (!account) return null;

    // SQL: UPDATE user_account SET status = 'suspended' WHERE id = ?
    await account.update({ status: 'suspended' });

    return UserAccount.publicFields(await UserAccount.findWithProfile(account.id));
  }

  // ---------------------------------------------------------------------------
  // Story #10: Search user accounts.
  // Finds accounts whose user ID, name or email CONTAINS the keyword,
  // ignoring capitals. An empty keyword lists every account.
  // Returns a list (array) of safe account objects, oldest first.
  // ---------------------------------------------------------------------------
  static async searchAccounts(keyword) {
    // String(...) turns anything into text. || '' handles undefined/null.
    const text = String(keyword || '').trim().toLowerCase();

    // Query settings: load each account's profile, sort by ID, smallest first (oldest first).
    const options = { include: UserProfile, order: [['id', 'ASC']] };

    if (text) {
      // % means "any characters" in SQL LIKE. '%kaz%' matches anything containing "kaz".
      const pattern = `%${text}%`;

      // Build: WHERE LOWER(username) LIKE '%kaz%'
      //           OR LOWER(name)     LIKE '%kaz%'
      //           OR LOWER(email)    LIKE '%kaz%'
      // .map() runs the arrow function once per field name and collects the
      // 3 conditions into a list. Op.or joins them with OR.
      // 'UserAccount.' in front of the column name tells the database which
      // table we mean, because the joined user_profile table also has a "name".
      options.where = {
        [Op.or]: ['username', 'name', 'email'].map((field) =>
          where(fn('LOWER', col(`UserAccount.${field}`)), { [Op.like]: pattern })),
      };
    }

    // SQL: SELECT ... FROM user_account JOIN user_profile ... WHERE ... ORDER BY id
    const accounts = await UserAccount.findAll(options);

    // Turn every row into its safe version (no passwords).
    return accounts.map((account) => UserAccount.publicFields(account));
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

// -----------------------------------------------------------------------------
// TABLE DEFINITION (from the project skeleton).
// UserAccount.init tells Sequelize which columns the user_account table has.
//   type      - the kind of data (STRING = text, DATEONLY = a date with no time)
//   allowNull - false means the column must have a value
//   unique    - true means no two rows may have the same value
// Sequelize also adds id, createdAt and updatedAt automatically.
// -----------------------------------------------------------------------------
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

// Each account belongs to exactly one profile (role).
// hasMany/belongsTo add a profileId column to user_account that points at a
// user_profile row. This link is what lets queries use { include: UserProfile }
// and read account.UserProfile.name.
UserProfile.hasMany(UserAccount, { foreignKey: { name: 'profileId', allowNull: false } });
UserAccount.belongsTo(UserProfile, { foreignKey: { name: 'profileId', allowNull: false } });

module.exports = UserAccount;
module.exports.canonicalRole = canonicalRole;
