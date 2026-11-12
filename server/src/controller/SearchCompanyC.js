// BCE: Control.
// Coordinates the search request for company data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: SearchCompanyC              (BCE: Controller layer)
// User story #17: As an Interior Designer, I want to search my company
// information so that I can find it quickly.
//
// Sequence for story #17:
//   1. SearchCompanyPg sends the keyword the designer typed
//   2. SearchCompanyC.searchCompanies(accountId, keyword)  <- THIS FILE
//        a. the keyword must be plain text of up to 255 characters
//        b. Company.searchCompany(accountId, keyword)   find the match
//   3. the list goes back (one company, or empty) and the page shows it
// =============================================================================

const Company = require('../entity/Company');
const { keyword } = require('./companyValidation');

class SearchCompanyC {
  // Receives: accountId = the logged-in designer, keywordText = what was typed.
  // Returns:  a list with the designer's company if it matches, otherwise [].
  async searchCompanies(accountId, keywordText) {
    return Company.searchCompany(accountId, keyword(keywordText));
  }
}

// Expose this module’s entry points to its callers.
module.exports = SearchCompanyC;
