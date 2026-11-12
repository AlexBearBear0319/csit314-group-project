// =============================================================================
// CONTROLLER HELPER: storageCleanup
// Removes photo files from storage after a database delete.
//
// The delete methods in the entities (deleteProject, deleteImage, cancelIntent)
// already saved a cleanup task for each file, in the same transaction as the
// delete. Here we try to remove the files for real:
//   - removed  -> IdpImageCleanupTask.recordResult deletes the task
//   - failed   -> the task stays (attempts + 1), and `npm run storage:cleanup`
//                 tries again later
// Returns { pending } = how many files could not be removed yet.
// =============================================================================

const IdpImageCleanupTask = require('../entity/IdpImageCleanupTask');
const { removeObjects } = require('../storage/IdpImageStorage');

async function removeFiles(paths) {
  if (!paths.length) return { pending: 0 };
  const result = await removeObjects(paths);
  await IdpImageCleanupTask.recordResult(result);
  return { pending: (result.failed || []).length };
}

module.exports = { removeFiles };
