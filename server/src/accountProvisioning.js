const bcrypt = require('bcryptjs');
const { col, fn, where } = require('sequelize');
const { sequelize, UserAccount, UserProfile, UserSession } = require('./entity');
const { canonicalRole } = UserAccount;

const VALID_ROLES = ['User Admin', 'Interior Designer', 'Customer', 'Platform Manager'];

async function resetAccountPassword({ username, password, roleName }) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  if (!normalizedUsername) throw new Error('Enter the exact user ID.');
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Use a password with at least 12 characters and no more than 72 bytes.');
  }

  const transaction = await sequelize.transaction();
  try {
    const accounts = await UserAccount.findAll({
      where: where(fn('LOWER', fn('TRIM', col('username'))), normalizedUsername),
      include: [{ model: UserProfile }],
      transaction,
    });
    if (accounts.length !== 1) throw new Error(accounts.length ? 'More than one account has this user ID.' : 'No account has this user ID.');
    const account = accounts[0];

    let targetProfile = account.UserProfile;
    if (roleName !== undefined) {
      const canonical = canonicalRole(roleName);
      if (!canonical || !VALID_ROLES.includes(canonical)) throw new Error('Choose one of the four known roles.');
      const profiles = await UserProfile.findAll({ transaction });
      const matches = profiles.filter((profile) => canonicalRole(profile.name) === canonical && profile.status === 'active');
      if (matches.length !== 1) throw new Error(`The ${canonical} profile is missing, inactive or duplicated.`);
      targetProfile = matches[0];
    } else if (!targetProfile || !canonicalRole(targetProfile.name)) {
      throw new Error('This account has no recognized role. Supply an explicit --role to repair it.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const changes = { password: passwordHash };
    if (roleName !== undefined && targetProfile.id !== account.profileId) changes.profileId = targetProfile.id;
    await account.update(changes, { transaction });
    await UserSession.destroy({ where: { accountId: account.id }, transaction });
    await transaction.commit();

    return { id: account.id, username: account.username, role: canonicalRole(targetProfile.name), sessionsRevoked: true };
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

module.exports = { resetAccountPassword };
