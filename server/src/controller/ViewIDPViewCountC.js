// =============================================================================
// CONTROLLER: ViewIDPViewCountC           (BCE: Controller layer)
// User story #30: As an Interior Designer, I want to view the view count of my
// IDPs so that I can track engagement with my projects.
//
// Sequence for story #30:
//   1. the designer's project page asks for the view count of project :id
//   2. ViewIDPViewCountC.viewIDPViewCount(designerAccountId, id)   <- THIS FILE
//        a. check the project ID
//        b. InteriorDesignProject.findOwned(...)   is it THIS designer's project?
//           If not, 404, so one designer cannot read another designer's numbers
//        c. read viewCount from the project
//   3. { projectId, viewCount } goes back and the page shows the number
//
// The count goes up by 1 each time a Customer opens the project (see
// IDPDatabase.getIDPDetails, story #33).
// =============================================================================

const InteriorDesignProject = require('../entity/InteriorDesignProject');
const RequestError = require('./RequestError');
const { parseProjectId } = require('./idpStatsValidation');

class ViewIDPViewCountC {
  // Receives: designerAccountId = the logged-in designer, id = project ID (text).
  // Returns:  { projectId, viewCount }
  async viewIDPViewCount(designerAccountId, id) {
    const projectId = parseProjectId(id);

    const project = await InteriorDesignProject.findOwned({ id: projectId, designerAccountId });
    if (!project) throw new RequestError(404, 'Project not found.');

    return { projectId, viewCount: project.viewCount };
  }
}

module.exports = ViewIDPViewCountC;
