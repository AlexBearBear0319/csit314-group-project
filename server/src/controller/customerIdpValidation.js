// =============================================================================
// CONTROLLER HELPER: customerIdpValidation
// Checks the search and browse options that a Customer sends (stories #32, #33):
//   keyword, propertyType, designStyle = plain text of up to 255 characters
//   page = a whole number from 1
//   sort = 'fifo' (oldest first), 'date' (newest first) or 'alphabetical'
//
// The Customer's search page only offers valid choices, so this is our second
// line of defence against hand-made requests.
// =============================================================================

const RequestError = require('./RequestError');
const { keyword } = require('./companyValidation');

// Returns the clean options, or throws a 400 error.
function searchOptions(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  if (typeof query.page === 'object' || !Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    throw new RequestError(400, 'Enter a valid page number.');
  }
  const sort = query.sort || 'date';
  if (!['fifo', 'date', 'alphabetical'].includes(sort)) {
    throw new RequestError(400, 'Choose a valid sort order.');
  }
  return {
    keyword: keyword(query.keyword).trim(),
    propertyType: keyword(query.propertyType).trim(),
    designStyle: keyword(query.designStyle).trim(),
    page,
    sort,
  };
}

module.exports = { searchOptions };
