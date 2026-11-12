// BCE: Control.
// Validates and normalizes company inputs before a controller uses them.

// =============================================================================
// CONTROLLER HELPER: companyValidation
// Input rules for the company stories (#13 create and #15 update) and for the
// search keyword (#17, and the customer's IDP search #32).
//
// The company pages check the same rules first so the designer sees a message
// at once. We check again here because anyone can call the API without our page.
// =============================================================================

const RequestError = require('./RequestError');

// Checks the name and description and returns them cleaned (trimmed).
// Throws one 400 error that lists every problem.
function companyFields(body) {
  const errors = {};
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = body?.description === undefined ? '' : body.description;

  if (!name || name.length > 255) errors.name = 'Enter a company name of up to 255 characters.';
  if (typeof description !== 'string' || description.trim().length > 5000) {
    errors.description = 'Enter a description of up to 5,000 characters.';
  }

  if (Object.keys(errors).length) throw new RequestError(400, 'Check the company details.', errors);
  return { name, description: description.trim() };
}

// A search keyword must be plain text of up to 255 characters. A missing
// keyword counts as an empty one.
function keyword(value = '') {
  if (typeof value !== 'string' || value.length > 255) {
    throw new RequestError(400, 'Enter a search term of up to 255 characters.');
  }
  return value;
}

// Expose this module’s entry points to its callers.
module.exports = { companyFields, keyword };
