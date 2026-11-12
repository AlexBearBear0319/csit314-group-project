// =============================================================================
// CONTROLLER: ViewIDPShortlistCountC      (BCE: Controller layer)
// User story #31: As an Interior Designer, I want to view the shortlist count
// of my IDPs so that I can track engagement with my projects.
//
// Sequence for story #31:
//   1. the designer's project page asks for the shortlist count of project :id
//   2. ViewIDPShortlistCountC.viewIDPShortlistCount(designerAccountId, id)   <- THIS FILE
//        a. check the project ID
//        b. InteriorDesignProject.findOwned(...)   is it THIS designer's project?
//           If not, 404
//        c. ShortlistItem.countForProject(id)      how many Customers saved it
//   3. { projectId, shortlistCount } goes back and the page shows the number
// =============================================================================

const InteriorDesignProject = require('../entity/InteriorDesignProject');
const ShortlistItem = require('../entity/ShortlistItem');
const RequestError = require('./RequestError');
const { parseProjectId } = require('./idpStatsValidation');

class ViewIDPShortlistCountC {
  // Receives: designerAccountId = the logged-in designer, id = project ID (text).
  // Returns:  { projectId, shortlistCount }
  async viewIDPShortlistCount(designerAccountId, id) {
    const projectId = parseProjectId(id);

    if (!(await InteriorDesignProject.findOwned({ id: projectId, designerAccountId }))) {
      throw new RequestError(404, 'Project not found.');
    }

    return { projectId, shortlistCount: await ShortlistItem.countForProject(projectId) };
  }
}

module.exports = ViewIDPShortlistCountC;
