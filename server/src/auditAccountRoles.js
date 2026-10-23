const { col, fn } = require('sequelize');
const { sequelize, UserAccount, UserProfile, InteriorDesignProject } = require('./entity');
const { canonicalRole } = UserAccount;

const HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function duplicates(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    const value = String(row[field] || '').trim().toLowerCase();
    if (!value) continue;
    groups.set(value, [...(groups.get(value) || []), row.id]);
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([value, accountIds]) => ({ value, accountIds }));
}

async function main() {
  try {
    await sequelize.authenticate();
    const [profiles, accounts, projectRows] = await Promise.all([
      UserProfile.findAll({ attributes: ['id', 'name', 'status'], raw: true }),
      UserAccount.findAll({
        attributes: ['id', 'username', 'email', 'password', 'status', 'profileId'],
        include: [{ model: UserProfile, attributes: ['id', 'name', 'status'], required: false }],
      }),
      InteriorDesignProject.findAll({
        attributes: ['designerAccountId', [fn('COUNT', col('id')), 'projectCount']],
        group: ['designerAccountId'],
        raw: true,
      }),
    ]);
    const projectCounts = new Map(projectRows.map((row) => [String(row.designerAccountId), Number(row.projectCount)]));
    const accountRows = accounts.map((account) => {
      const profile = account.UserProfile;
      const role = canonicalRole(profile?.name);
      return {
        id: account.id,
        userId: account.username,
        email: account.email,
        roleName: profile?.name || null,
        canonicalRole: role,
        accountStatus: account.status,
        profileStatus: profile?.status || null,
        hasValidBcryptHash: HASH_PATTERN.test(account.password || ''),
        projectCount: projectCounts.get(String(account.id)) || 0,
        profileId: account.profileId,
      };
    });

    const profileNames = new Map();
    for (const profile of profiles) {
      const key = String(profile.name || '').trim().toLowerCase();
      profileNames.set(key, [...(profileNames.get(key) || []), profile.id]);
    }
    const report = {
      accounts: accountRows.map(({ id, userId, roleName, canonicalRole: role, accountStatus, profileStatus, hasValidBcryptHash, projectCount }) => ({
        id, userId, roleName, canonicalRole: role, accountStatus, profileStatus, hasValidBcryptHash, projectCount,
      })),
      accountsNeedingReview: accountRows.filter((row) => (
        !row.canonicalRole || row.accountStatus !== 'active' || row.profileStatus !== 'active' || !row.hasValidBcryptHash
      )).map(({ id, userId, roleName, canonicalRole: role, accountStatus, profileStatus, hasValidBcryptHash }) => ({
        id, userId, roleName, canonicalRole: role, accountStatus, profileStatus, hasValidBcryptHash,
      })),
      duplicateUserIds: duplicates(accountRows, 'userId'),
      duplicateEmails: duplicates(accountRows, 'email'),
      duplicateRoleNames: [...profileNames.entries()].filter(([, ids]) => ids.length > 1).map(([name, ids]) => ({ name, profileIds: ids })),
      roleNamesMissing: ['User Admin', 'Interior Designer', 'Customer', 'Platform Manager']
        .filter((role) => !profileNames.has(role.toLowerCase())),
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Account audit failed: ${error.message}\n`);
  process.exitCode = 1;
});
