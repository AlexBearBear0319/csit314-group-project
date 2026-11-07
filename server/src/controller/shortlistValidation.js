// =============================================================================
// CONTROLLER HELPER: shortlistValidation.js
// Shared input checks used by the Shortlist controllers (#34-36).
//
// This file gives other files 2 functions:
//   projectIdFromBody - checks the project ID sent when saving (#34)
//   projectIdFromUrl  - checks the project ID in the web address (#36)
// =============================================================================

// Load the error type that also carries a web status code.
const { RequestError } = require('./userAccountValidation');

// The largest ID the database column can hold. A larger number can never be real.
const MAX_ID = 2147483647;

// =============================================================================
// FUNCTION: isProjectId (helper, only used in this file)
// WHAT IT DOES: checks that a value is a whole number from 1 up to MAX_ID.
// GIVES BACK: true or false.
// =============================================================================
function isProjectId(value) {
  // && means "and". All 3 parts must be true.
  return Number.isInteger(value) && value >= 1 && value <= MAX_ID;
} // End of isProjectId.

// =============================================================================
// FUNCTION: projectIdFromBody
// WHAT IT DOES: reads the project ID from the data the page sent.
// RECEIVES: body = the JSON the browser sent, such as { projectId: 5 }.
// GIVES BACK: the ID. If it is wrong or missing, it stops with a 400 error.
// =============================================================================
function projectIdFromBody(body) {
  // ?. means: read .projectId only if body exists.
  const value = body?.projectId;
  // Stop if it is not a valid ID. errors shows the message beside the right field.
  if (!isProjectId(value)) {
    throw new RequestError(400, 'Check the fields and try again.', { projectId: 'Choose a project to save.' });
  }
  // The ID is good, so hand it back.
  return value;
} // End of projectIdFromBody.

// =============================================================================
// FUNCTION: projectIdFromUrl
// WHAT IT DOES: the ID in the address (/customer/shortlist/5) arrives as text.
// This turns it into a number. "abc" can never match a project, so it answers
// 404 Not Found.
// RECEIVES: value = the ID as text.
// GIVES BACK: the ID as a number.
// =============================================================================
function projectIdFromUrl(value) {
  const id = Number(value); // "5" -> 5,  "abc" -> NaN (Not a Number)
  // Stop if it is not a valid ID.
  if (!isProjectId(id)) throw new RequestError(404, 'This project is not in your shortlist.');
  // The ID is good, so hand it back.
  return id;
} // End of projectIdFromUrl.

// Let the Shortlist controllers load these 2 functions.
module.exports = { projectIdFromBody, projectIdFromUrl };
