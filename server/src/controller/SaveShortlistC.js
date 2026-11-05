// =============================================================================
// CONTROLLER: SaveShortlistC
// User story #34: "As a Customer, I want to save an IDP to my shortlist."
//
// HOW THE REQUEST TRAVELS:
//   Boundary (the web page) -> route POST /api/customer/shortlist
//   -> SaveShortlistC.saveProject()      <- THIS FILE
//   -> ShortlistItem.saveProject()  (entity, saves to the database)
//
// (The words const, require, class, async, await, return are explained at the
// top of entity/ShortlistItem.js.)
// =============================================================================

// Load the entity class that saves to the shortlist_item table.
const ShortlistItem = require('../entity/ShortlistItem');
// Load the error type that also carries a web status code.
const { RequestError } = require('./userAccountValidation');
// Load the check for the project ID.
const { projectIdFromBody } = require('./shortlistValidation');

// Start of the class for story #34.
class SaveShortlistC {
  // ---------------------------------------------------------------------------
  // FUNCTION: saveProject
  // WHAT IT DOES: saves one project to the logged-in Customer's shortlist.
  // RECEIVES: customerAccountId = from the login session, never from the browser
  //           body              = what the page sent: { projectId }
  // GIVES BACK: the saved project, or null if no project has this ID.
  // ---------------------------------------------------------------------------
  async saveProject(customerAccountId, body) {
    // Step 1: check the project ID. If it is wrong, this stops with a 400 error.
    const projectId = projectIdFromBody(body);

    // Step 2: ask the entity to save it.
    const result = await ShortlistItem.saveProject(customerAccountId, projectId);

    // Step 3: pass "not found" on as null (the route sends 404) ...
    if (!result) return null;

    // ... turn "already saved" into 409 Conflict ...
    if (result.conflict) throw new RequestError(409, 'This project is already in your shortlist.');

    // ... or return the saved project (the route sends 201 Created).
    return result.project;
  } // End of saveProject.
} // End of the class.

// Let other files load this class. routes/shortlist.js uses it.
module.exports = SaveShortlistC;
