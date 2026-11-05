// =============================================================================
// CONTROLLER: ViewShortlistC
// User story #36: "As a Customer, I want to view a shortlisted IDP."
//
// HOW THE REQUEST TRAVELS:
//   Boundary (the web page) -> route GET /api/customer/shortlist/:id
//   -> ViewShortlistC.viewSaved()     <- THIS FILE
//   -> ShortlistItem.viewSaved()  (entity, reads the database)
//
// (The words const, require, class, async, await and return are explained at
// the top of entity/ShortlistItem.js.)
// =============================================================================

// Load the entity class that reads the shortlist_item table.
const ShortlistItem = require('../entity/ShortlistItem');
// Load the tool that makes a short-lived web address for a private photo.
const { createSignedReadUrl } = require('../storage/IdpImageStorage');
// Load the check for the ID in the web address.
const { projectIdFromUrl } = require('./shortlistValidation');

// =============================================================================
// FUNCTION: renderImage (helper, only used in this file)
// WHAT IT DOES: builds the safe copy of one photo for the browser. The private
// storage path is deliberately left out.
// RECEIVES: image = one photo row from the database.
// GIVES BACK: the safe copy, with a web address for the photo.
// =============================================================================
async function renderImage(image) {
  let url = null; // no web address yet
  // "try" means: run this, and if it fails, jump to "catch".
  try {
    // Ask the photo storage for a short-lived web address.
    url = await createSignedReadUrl(image.storagePath);
  } catch {
    // If storage is offline, keep the page working. It shows the project without
    // this photo.
  }
  // Hand back the safe copy.
  return { id: image.id, url, altText: image.altText, fileName: image.fileName };
} // End of renderImage.

// Start of the class for story #36.
class ViewShortlistC {
  // ---------------------------------------------------------------------------
  // FUNCTION: viewSaved
  // WHAT IT DOES: finds one project in the logged-in Customer's shortlist.
  // RECEIVES: customerAccountId = from the login session, never from the browser
  //           id                = the project ID from the web address, as text
  // GIVES BACK: the project with its photos, or null if this Customer did not
  //             save it. The route turns null into 404 Not Found.
  // ---------------------------------------------------------------------------
  async viewSaved(customerAccountId, id) {
    // Step 1: check the ID. If it cannot be real, this stops with a 404 error.
    const projectId = projectIdFromUrl(id);

    // Step 2: ask the entity for the saved project.
    const project = await ShortlistItem.viewSaved(customerAccountId, projectId);

    // Step 3: if this Customer did not save it, stop here.
    if (!project) return null;

    // Step 4: read the project's photos and build a safe copy of each one.
    // Promise.all waits until every photo is ready.
    const images = await Promise.all((await ShortlistItem.savedImages(projectId)).map(renderImage));

    // Step 5: hand back the project, with its photo count and photos.
    return { ...project, imageCount: images.length, images };
  } // End of viewSaved.
} // End of the class.

// Let other files load this class. routes/shortlist.js uses it.
module.exports = ViewShortlistC;
