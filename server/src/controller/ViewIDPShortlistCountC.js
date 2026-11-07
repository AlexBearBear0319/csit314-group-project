// CONTROLLER: ViewIDPShortlistCountC
// Story #31: an Interior Designer views how many customers shortlisted
// one of their IDPs.
const ShortlistItem = require('../entity/ShortlistItem');
const { parseProjectId } = require('./idpStatsValidation');

class ViewIDPShortlistCountC {
  // Same inputs as ViewIDPViewCountC.viewIDPViewCount.
  // Returns { projectId, shortlistCount }, or null if this designer does not own the project.
  async viewIDPShortlistCount(designerAccountId, id) {
    const projectId = parseProjectId(id);
    const shortlistCount = await ShortlistItem.countForOwnedProject(designerAccountId, projectId);
    return shortlistCount === null ? null : { projectId, shortlistCount };
  }
}

module.exports = ViewIDPShortlistCountC;
