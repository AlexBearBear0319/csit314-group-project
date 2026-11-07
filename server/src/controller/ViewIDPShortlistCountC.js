const ShortlistItem = require('../entity/ShortlistItem');
const { parseProjectId } = require('./idpStatsValidation');

// Story #31: an Interior Designer views how many Customers shortlisted their IDP.
class ViewIDPShortlistCountC {
  // Returns { projectId, shortlistCount }, or null when the IDP is not this designer's.
  async viewIDPShortlistCount(designerAccountId, id) {
    const projectId = parseProjectId(id);
    const shortlistCount = await ShortlistItem.countForOwnedProject(designerAccountId, projectId);
    return shortlistCount === null ? null : { projectId, shortlistCount };
  }
}
module.exports = ViewIDPShortlistCountC;
