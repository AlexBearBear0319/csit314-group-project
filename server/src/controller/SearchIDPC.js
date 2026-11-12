// =============================================================================
// CONTROLLER: SearchIDPC                  (BCE: Controller layer)
// User story #32: As a Customer, I want to search for IDPs so that I can find
// projects that match my renovation preferences.
//
// Sequence for story #32:
//   1. IDPManagementPage (the Customer's search page) sends the keyword and filters
//   2. SearchIDPC.searchIDPs(query)                        <- THIS FILE
//        a. check the options (keyword, filters, page, sort)
//        b. there must be a keyword or a filter, or nothing to search for
//        c. IDPDatabase.searchByKeyword(...)       find the matching projects
//        d. add hasResults so the page can show "no matches"
//   3. the page shows the projects (or the "no results" message)
// =============================================================================

const IDPDatabase = require('../entity/IDPDatabase');
const RequestError = require('./RequestError');
const { searchOptions } = require('./customerIdpValidation');

class SearchIDPC {
  // Receives: query = { keyword, propertyType, designStyle, page, sort }
  // Returns:  { projects, total, page, pageSize, totalPages, hasResults }
  async searchIDPs(query) {
    const options = searchOptions(query);

    if (!options.keyword && !options.propertyType && !options.designStyle) {
      throw new RequestError(400, 'Enter a keyword or choose a filter.');
    }

    const results = await IDPDatabase.searchByKeyword(options.keyword, options);
    return { ...results, hasResults: results.total > 0 };
  }

  // The choices for the filter dropdowns on the search page.
  // Returns { propertyTypes: [...], designStyles: [...] }
  async listFilters() {
    return IDPDatabase.availableFilters();
  }
}

module.exports = SearchIDPC;
