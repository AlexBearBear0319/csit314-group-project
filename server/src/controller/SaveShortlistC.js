// =============================================================================
// CONTROLLER: SaveShortlistC              (BCE: Controller layer)
// User story #34: As a Customer, I want to save an IDP to my shortlist so that
// I can find it again later.
//
// Sequence for story #34:
//   1. SaveShortlistPg sends { projectId } when the Customer taps "Save"
//   2. SaveShortlistC.saveProject(customerAccountId, body)   <- THIS FILE
//        a. check the project ID
//        b. InteriorDesignProject.findProject(id)  does the project exist?
//        c. ShortlistItem.findItem(...)            already saved? -> 409
//        d. ShortlistItem.createItem(...)          save it
//   3. the saved project goes back -> displaySuccess()
//
// customerAccountId comes from the login session on the server, never from the
// page, so a Customer can only change their own shortlist.
// =============================================================================

const ShortlistItem = require('../entity/ShortlistItem');
const InteriorDesignProject = require('../entity/InteriorDesignProject');
const RequestError = require('./RequestError');
const { projectIdFromBody } = require('./shortlistValidation');

class SaveShortlistC {
  // Receives: customerAccountId = the logged-in Customer, body = { projectId }
  // Returns:  the saved project's safe fields.
  async saveProject(customerAccountId, body) {
    const projectId = projectIdFromBody(body);

    if (!(await InteriorDesignProject.findProject(projectId))) {
      throw new RequestError(404, 'This project is not available.');
    }

    // Business rule: a project can be in a Customer's shortlist only once.
    if (await ShortlistItem.findItem(customerAccountId, projectId)) {
      throw new RequestError(409, 'This project is already in your shortlist.');
    }

    return ShortlistItem.createItem(customerAccountId, projectId);
  }
}

module.exports = SaveShortlistC;
