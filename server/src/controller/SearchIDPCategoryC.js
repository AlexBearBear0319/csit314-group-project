// =============================================================================
// CONTROLLER: SearchIDPCategoryC          (BCE: Controller layer)
// User story #43: As a Platform Manager, I want to search for IDP categories
// so that I can quickly find a specific category.
//
// Sequence for story #43:
//   1. SearchIDPCategoryPg sends the keyword the manager typed
//   2. SearchIDPCategoryC.searchCategories(keyword)        <- THIS FILE
//        a. the keyword must be plain text
//        b. IDPCategory.searchCategories(keyword)  find the matches
//   3. the list goes back and the page shows it
// =============================================================================

const IDPCategory = require('../entity/IDPCategory');
const RequestError = require('./RequestError');

class SearchIDPCategoryC {
  // Receives: keyword = text, or nothing (which lists every category).
  // Returns:  the matching categories.
  async searchCategories(keyword = '') {
    if (typeof keyword !== 'string') throw new RequestError(400, 'Enter a search keyword as text.');
    return IDPCategory.searchCategories(keyword);
  }
}

module.exports = SearchIDPCategoryC;
