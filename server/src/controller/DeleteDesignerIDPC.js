// =============================================================================
// CONTROLLER: DeleteDesignerIDPC          (BCE: Controller layer)
// User story #23 (current IDP): As an Interior Designer, I want to delete a
// current IDP so that it is no longer shown in my portfolio.
// User story #28 (past IDP): As an Interior Designer, I want to delete a past
// IDP so that it is no longer shown in my portfolio.
//
// Sequence for #23 and #28:
//   1. the designer's page asks the designer to confirm, then sends the ID
//   2. DeleteDesignerIDPC.deleteIDP(designerAccountId, status, id)   <- THIS FILE
//        a. check the ID
//        b. InteriorDesignProject.deleteProject(...)   delete the project and its
//           photo rows, and save a cleanup task for every photo file. This only
//           works if the project is THIS designer's and has this status.
//        c. not found -> 404 "Project not found."
//        d. removeFiles(paths)                     remove the photo files from
//           storage. If storage is down, the cleanup tasks stay and the files
//           are removed later (npm run storage:cleanup).
//   3. { deleted: true, cleanupPending } goes back -> displaySuccess()
// =============================================================================

const InteriorDesignProject = require('../entity/InteriorDesignProject');
const RequestError = require('./RequestError');
const { projectIdFromUrl } = require('./designerIdpValidation');
const { removeFiles } = require('./storageCleanup');

class DeleteDesignerIDPC {
  // Receives: designerAccountId = the logged-in designer
  //           status = 'current' (story #23) or 'past' (story #28)
  //           id = the project ID from the web address, as text
  // Returns:  { deleted: true, cleanupPending } where cleanupPending is true when
  //           some photo files could not be removed from storage yet.
  async deleteIDP(designerAccountId, status, id) {
    const deleted = await InteriorDesignProject.deleteProject({
      id: projectIdFromUrl(id),
      designerAccountId,
      status,
    });
    if (!deleted) throw new RequestError(404, 'Project not found.');

    const cleanup = await removeFiles(deleted.paths);
    return { deleted: true, cleanupPending: cleanup.pending > 0 };
  }
}

module.exports = DeleteDesignerIDPC;
