// BCE: Control.
// Validates and normalizes idp category inputs before a controller uses them.

// =============================================================================
// CONTROLLER HELPER: idpCategoryValidation
// Input rules for the IDP category stories (#39 create and #41 update), plus
// the ID check used by #40, #41 and #42.
//
// The category pages check the same rules first so the Platform Manager sees a
// message at once. We check again here because anyone can call the API without
// our page.
// =============================================================================

const RequestError = require('./RequestError');

// Checks the name and description and returns them cleaned (trimmed).
// Throws one 400 error that lists every problem.
function categoryFields(body) {
  const errors = {};
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = body?.description == null ? '' : body.description;

  if (!name) errors.name = 'Enter a category name.';
  else if (name.length > 255) errors.name = 'Use 255 characters or fewer.';
  if (typeof description !== 'string') errors.description = 'Enter a description as text.';
  else if (description.trim().length > 255) errors.description = 'Use 255 characters or fewer.';

  if (Object.keys(errors).length) throw new RequestError(400, Object.values(errors)[0], errors);
  return { name, description: description.trim() };
}

// The ID in the web address arrives as text. It must be a whole number from 1
// up to the largest ID the database can hold.
function categoryId(id) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) > 2147483647) {
    throw new RequestError(400, 'Invalid IDP category ID.');
  }
  return Number(id);
}

// Expose this module’s entry points to its callers.
module.exports = { categoryFields, categoryId };
