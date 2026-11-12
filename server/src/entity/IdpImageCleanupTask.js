// =============================================================================
// ENTITY: IdpImageCleanupTask      (BCE: Entity layer)
// A to-do list of photo files that still have to be removed from storage.
//
// Why do we need it? When a designer deletes a project or a photo, we remove
// the database row first. The photo file lives in Supabase Storage, which can
// fail for a moment. Before deleting the row we write the file path here. If
// storage removes the file we delete the task. If not, the task stays, and the
// script `npm run storage:cleanup` tries again later. No photo is lost track of.
//
// Table: idp_image_cleanup_task (designerAccountId, storagePath, attempts, lastError)
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class IdpImageCleanupTask extends Model {
  // CREATE tasks for these file paths (a path that already has a task is skipped).
  // transaction = optional, so the tasks are saved together with the delete.
  static async queue(paths, designerAccountId, transaction) {
    for (const storagePath of [...new Set(paths)].filter(Boolean)) {
      await IdpImageCleanupTask.findOrCreate({
        where: { storagePath },
        defaults: { designerAccountId, storagePath, attempts: 0 },
        transaction,
      });
    }
  }

  // UPDATE / DELETE after we tried to remove files from storage.
  //   removed = paths storage removed  -> their tasks are deleted
  //   failed  = paths storage could not remove -> attempts goes up, error is kept
  static async recordResult({ removed = [], failed = [], error }) {
    for (const storagePath of removed) {
      await IdpImageCleanupTask.destroy({ where: { storagePath } });
    }
    for (const storagePath of failed) {
      const task = await IdpImageCleanupTask.findOne({ where: { storagePath } });
      if (task) {
        await task.update({
          attempts: task.attempts + 1,
          lastError: String(error || 'Storage could not remove the image.').slice(0, 500),
        });
      }
    }
  }
}

IdpImageCleanupTask.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    designerAccountId: { type: DataTypes.INTEGER, allowNull: false, field: 'designer_account_id' },
    storagePath: { type: DataTypes.STRING(512), allowNull: false, unique: true, field: 'storage_path' },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastError: { type: DataTypes.STRING(500), allowNull: true, field: 'last_error' },
  },
  {
    sequelize,
    modelName: 'IdpImageCleanupTask',
    tableName: 'idp_image_cleanup_task',
    underscored: true,
    indexes: [{ fields: ['created_at'] }],
  }
);

module.exports = IdpImageCleanupTask;
