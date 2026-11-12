// =============================================================================
// CONTROLLER: ViewShortlistC              (BCE: Controller layer)
// User story #36: As a Customer, I want to view my shortlist so that I can see
// all the IDPs I have saved.
//
// Sequence for story #36:
//   1. ViewShortlistPg opens (the list), or the Customer opens one project
//   2. ViewShortlistC.viewShortlist(customerAccountId)     <- THIS FILE
//        ShortlistItem.viewShortlist(...)          the whole list
//      ViewShortlistC.viewSaved(customerAccountId, id)
//        a. check the ID
//        b. ShortlistItem.viewSaved(...)           one saved project (404 if
//           this Customer did not save it)
//        c. ShortlistItem.savedImages(...) + a short-lived link per photo
//   3. the list or the project goes back and the page shows it
// =============================================================================

const ShortlistItem = require('../entity/ShortlistItem');
const RequestError = require('./RequestError');
const { createSignedReadUrl } = require('../storage/IdpImageStorage');
const { projectIdFromUrl } = require('./shortlistValidation');

// Turns one image row into what the page needs. The photo files are private, so
// we ask storage for a link that works for only a few minutes.
async function renderImage(image) {
  let url = null;
  try {
    url = await createSignedReadUrl(image.storagePath);
  } catch {
    // If storage is down we still show the project, just without this photo.
  }
  return { id: image.id, url, altText: image.altText, fileName: image.fileName };
}

class ViewShortlistC {
  // Returns: every project this Customer saved, the latest save first.
  async viewShortlist(customerAccountId) {
    return ShortlistItem.viewShortlist(customerAccountId);
  }

  // Receives: id = the project ID from the web address, as text.
  // Returns:  one saved project with its photos.
  async viewSaved(customerAccountId, id) {
    const projectId = projectIdFromUrl(id);

    const project = await ShortlistItem.viewSaved(customerAccountId, projectId);
    if (!project) throw new RequestError(404, 'This project is not in your shortlist.');

    const images = await Promise.all((await ShortlistItem.savedImages(projectId)).map(renderImage));
    return { ...project, imageCount: images.length, images };
  }
}

module.exports = ViewShortlistC;
