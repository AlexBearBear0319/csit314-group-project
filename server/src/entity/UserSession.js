// =============================================================================
// ENTITY: UserSession            (BCE: Entity layer)
// One login session of one account. The browser holds a random token in a
// cookie. We only store a hash of that token, so a leaked table cannot be used
// to log in.
//
// Table: user_session (accountId, tokenHash, csrfToken, expiresAt)
//
// Used by: UserLoginC (create), UserLogoutC (delete), VerifySessionC (read).
// Like the other entities, this class only does CRUD. The controllers decide
// who may have a session and for how long.
// =============================================================================

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../db');

class UserSession extends Model {
  // CREATE. values = { accountId, tokenHash, csrfToken, expiresAt }.
  static async createSession(values) {
    return UserSession.create(values);
  }

  // READ the session behind a cookie token, together with its account and the
  // account's profile. Expired sessions are not found.
  // The models are loaded here (not at the top) because UserAccount also
  // requires this file.
  static async findActive(tokenHash) {
    const UserAccount = require('./UserAccount');
    const UserProfile = require('./UserProfile');
    return UserSession.findOne({
      where: { tokenHash, expiresAt: { [Op.gt]: new Date() } },
      include: [{ model: UserAccount, include: [UserProfile] }],
    });
  }

  // DELETE one session (logout, or a session that is no longer allowed).
  static async deleteSession(session) {
    return session.destroy();
  }

  // DELETE every session of one account (used when a password is reset).
  static async deleteSessionsOf(accountId) {
    return UserSession.destroy({ where: { accountId } });
  }
}

UserSession.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    accountId: { type: DataTypes.INTEGER, allowNull: false, field: 'account_id' },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_hash' },
    csrfToken: { type: DataTypes.STRING(64), allowNull: false, field: 'csrf_token' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  },
  {
    sequelize,
    modelName: 'UserSession',
    tableName: 'user_session',
    underscored: true,
    indexes: [{ fields: ['account_id', 'expires_at'] }],
  }
);

module.exports = UserSession;
