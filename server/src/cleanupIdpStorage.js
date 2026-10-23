const { Op } = require('sequelize');
const { sequelize, IdpImageCleanupTask, IdpImageUploadIntent } = require('./entity');
const { removeObjects } = require('./storage/IdpImageStorage');

async function cleanupIdpStorage() {
  const expiredIntents = await IdpImageUploadIntent.findAll({
    where: { expiresAt: { [Op.lte]: new Date() } },
  });

  for (const intent of expiredIntents) {
    const transaction = await sequelize.transaction();
    try {
      await IdpImageCleanupTask.findOrCreate({
        where: { storagePath: intent.storagePath },
        defaults: {
          designerAccountId: intent.designerAccountId,
          storagePath: intent.storagePath,
          attempts: 0,
        },
        transaction,
      });
      await intent.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  const tasks = await IdpImageCleanupTask.findAll({ order: [['createdAt', 'ASC']] });
  let removed = 0;
  let pending = 0;
  for (const task of tasks) {
    const result = await removeObjects([task.storagePath]);
    if (result.removed?.includes(task.storagePath)) {
      await task.destroy();
      removed += 1;
    } else {
      await task.update({
        attempts: task.attempts + 1,
        lastError: String(result.error || 'Storage could not remove the image.').slice(0, 500),
      });
      pending += 1;
    }
  }

  return { expiredIntents: expiredIntents.length, removed, pending };
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      const result = await cleanupIdpStorage();
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } catch (error) {
      process.stderr.write(`Storage cleanup failed: ${error.message}\n`);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  })();
}

module.exports = cleanupIdpStorage;
