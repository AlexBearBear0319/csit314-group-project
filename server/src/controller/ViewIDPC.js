// =============================================================================
// CONTROLLER: ViewIDPC                    (BCE: Controller layer)
// User story #33: As a Customer, I want to view an IDP so that I can see its
// design details and the interior designer behind it.
//
// Sequence for story #33:
//   1. the Customer's search page opens (the list), or the Customer opens one
//      project
//   2. ViewIDPC.browseIDPs(query)                          <- THIS FILE
//        a. check the options, then IDPDatabase.retrieveIDP(...)  the list
//      ViewIDPC.viewIDP(id)
//        a. check the ID
//        b. IDPDatabase.getIDPDetails(id)          the project (+1 view count)
//        c. not found -> 404
//        d. sort the photos and give each a short-lived link
//   3. the list or the project goes back and the page shows it
// =============================================================================

const IDPDatabase = require('../entity/IDPDatabase');
const RequestError = require('./RequestError');
const { createSignedReadUrl } = require('../storage/IdpImageStorage');
const { searchOptions } = require('./customerIdpValidation');

class ViewIDPC {
  // The list a Customer sees before searching, sorted by date or name.
  // Receives: query = { page, sort }   Returns: { projects, total, page, ... }
  async browseIDPs(query = {}) {
    return IDPDatabase.retrieveIDP(searchOptions(query));
  }

  // Receives: id = the project ID from the web address, as text.
  // Returns:  the project with its photos.
  async viewIDP(id) {
    if (!/^[1-9][0-9]*$/.test(id) || Number(id) > 2147483647) {
      throw new RequestError(400, 'Invalid project ID.');
    }

    const project = await IDPDatabase.getIDPDetails(Number(id));
    if (!project) throw new RequestError(404, 'Project not found.');

    // Photos in the order the designer chose.
    const orderedImages = [...project.images].sort((left, right) =>
      left.sortOrder - right.sortOrder || left.id - right.id);
    const images = await Promise.all(orderedImages.map(async (image) => {
      // The photo files are private. We ask storage for a link that only works
      // for a few minutes. If storage is down we still show the project.
      let url = null;
      try {
        url = await createSignedReadUrl(image.storagePath);
      } catch {
        // keep url = null
      }
      return { id: image.id, fileName: image.fileName, altText: image.altText, sortOrder: image.sortOrder, url };
    }));

    return { ...project, images, imageCount: images.length };
  }
}

module.exports = ViewIDPC;
