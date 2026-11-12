// =============================================================================
// CONTROLLER: SearchShortlistC            (BCE: Controller layer)
// User story #35: As a Customer, I want to search my shortlist so that I can
// quickly find a specific saved IDP.
//
// Sequence for story #35:
//   1. SearchShortlistPg sends the keyword the Customer typed
//   2. SearchShortlistC.searchSaved(customerAccountId, keyword)   <- THIS FILE
//        a. make sure the keyword is plain text
//        b. ShortlistItem.searchSaved(...)         find this Customer's matches
//   3. the list goes back and the page shows it (or "no results")
// =============================================================================

const ShortlistItem = require('../entity/ShortlistItem');

class SearchShortlistC {
  // Receives: customerAccountId = the logged-in Customer, keyword = what was typed.
  // Returns:  the saved projects that match, newest save first.
  async searchSaved(customerAccountId, keyword) {
    // ?keyword=a&keyword=b arrives as a list. We only accept text.
    return ShortlistItem.searchSaved(customerAccountId, typeof keyword === 'string' ? keyword : '');
  }
}

module.exports = SearchShortlistC;
