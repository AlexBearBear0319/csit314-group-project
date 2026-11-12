// =============================================================================
// CONTROLLER HELPER: shortlistValidation
// ID checks for the shortlist stories (#34 save, #36 view).
//
// A project ID must be a whole number from 1 up to the largest ID the database
// can hold. SaveShortlistPg only lets the Customer save a project that is on
// screen, so this check is our second line of defence against hand-made requests.
// =============================================================================

const RequestError = require('./RequestError');

const MAX_ID = 2147483647;

function isProjectId(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_ID;
}

// The project ID in the body of "save" (a JSON number).
function projectIdFromBody(body) {
  const value = body?.projectId;
  if (!isProjectId(value)) {
    throw new RequestError(400, 'Check the fields and try again.', { projectId: 'Choose a project to save.' });
  }
  return value;
}

// The project ID in the web address of "view" (text, so we turn it into a number).
// A bad ID can never be in the shortlist, so we answer 404.
function projectIdFromUrl(value) {
  const id = Number(value);
  if (!isProjectId(id)) throw new RequestError(404, 'This project is not in your shortlist.');
  return id;
}

module.exports = { projectIdFromBody, projectIdFromUrl };
