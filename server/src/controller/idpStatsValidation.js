// =============================================================================
// CONTROLLER HELPER: idpStatsValidation
// ID check for the designer's statistics stories (#30 view count, #31 shortlist
// count). The ID in the web address arrives as text. It must be a whole number
// from 1 up to the largest ID the database can hold.
// =============================================================================

const RequestError = require('./RequestError');

function parseProjectId(id) {
  if (!/^[1-9][0-9]*$/.test(String(id)) || Number(id) > 2147483647) {
    throw new RequestError(400, 'Invalid project ID.');
  }
  return Number(id);
}

module.exports = { parseProjectId };
