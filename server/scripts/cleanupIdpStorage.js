// BCE: Outside BCE (application setup or infrastructure).
// Finds project image objects eligible for cleanup and delegates removal to the storage adapter.

// =============================================================================
// SCRIPT: cleanupIdpStorage.js (npm run storage:cleanup)
// Removes photo files that are still in storage after a failed delete, and old upload
// plans that were never finished. See IdpImageCleanupTask for why this is needed.
// We run it by hand. It is not part of the app.
// =============================================================================

const { Op } = require('sequelize');
const { sequelize, IdpImageCleanupTask, IdpImageUploadIntent } = require('../src/entity');
const { removeObjects } = require('../src/storage/IdpImageStorage');

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

// Expose this module’s entry points to its callers.
module.exports = cleanupIdpStorage;
