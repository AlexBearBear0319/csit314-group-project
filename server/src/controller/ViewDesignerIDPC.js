// =============================================================================
// CONTROLLER: ViewDesignerIDPC            (BCE: Controller layer)
// User story #21 (current IDP): As an Interior Designer, I want to view a
// current IDP so that I can check its details.
// User story #26 (past IDP): As an Interior Designer, I want to view a past IDP
// so that I can check its details.
//
// Sequence for #21 and #26:
//   1. the designer's page asks for project :id
//   2. ViewDesignerIDPC.viewIDP(designerAccountId, status, id)   <- THIS FILE
//        a. check the ID
//        b. InteriorDesignProject.findOwned(...)   the project, with its photos,
//           but only if it is THIS designer's and has this status
//        c. not found -> 404 "Project not found."
//        d. give every photo a short-lived link
//   3. the project goes back and the page shows the details and photos
// =============================================================================

const InteriorDesignProject = require('../entity/InteriorDesignProject');
const RequestError = require('./RequestError');
const { projectIdFromUrl } = require('./designerIdpValidation');
const { renderProject } = require('./designerIdpPresenter');

class ViewDesignerIDPC {
  // Receives: designerAccountId = the logged-in designer
  //           status = 'current' (story #21) or 'past' (story #26)
  //           id = the project ID from the web address, as text
  // Returns:  { project }
  async viewIDP(designerAccountId, status, id) {
    const project = await InteriorDesignProject.findOwned({
      id: projectIdFromUrl(id),
      designerAccountId,
      status,
      withImages: true,
    });
    if (!project) throw new RequestError(404, 'Project not found.');
    return { project: await renderProject(project) };
  }
}

module.exports = ViewDesignerIDPC;
