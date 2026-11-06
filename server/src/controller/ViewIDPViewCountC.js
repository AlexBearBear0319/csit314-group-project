const InteriorDesignProject = require('../entity/InteriorDesignProject');
const { parseProjectId } = require('./idpStatsValidation');

// Story #30: an Interior Designer views how many times their IDP was viewed.
class ViewIDPViewCountC {
  // Returns { projectId, viewCount }, or null when the IDP is not this designer's.
  async viewIDPViewCount(designerAccountId, id) {
    const projectId = parseProjectId(id);
    const viewCount = await InteriorDesignProject.viewCountOwned(designerAccountId, projectId);
    return viewCount === null ? null : { projectId, viewCount };
  }
}
module.exports = ViewIDPViewCountC;
