// ENTITY: UserSession — revocable server-side login session. Only a hash of
// the browser's session token is stored.
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class UserSession extends Model {}

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
