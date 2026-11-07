// CONTROLLER: ViewIDPViewCountC
// Story #30: an Interior Designer views how many times one of their IDPs
// has been viewed by customers.
const InteriorDesignProject = require('../entity/InteriorDesignProject');
const { parseProjectId } = require('./idpStatsValidation');

class ViewIDPViewCountC {
  // designerAccountId = the logged-in designer (taken from the session, not from the browser)
  // id                = the project id from the web address
  // Returns { projectId, viewCount }, or null if this designer does not own the project.
  async viewIDPViewCount(designerAccountId, id) {
    const projectId = parseProjectId(id);
    const viewCount = await InteriorDesignProject.viewCountOwned(designerAccountId, projectId);
    // null means "not found or not yours". The route sends 404 for it.
    return viewCount === null ? null : { projectId, viewCount };
  }
}

module.exports = ViewIDPViewCountC;
