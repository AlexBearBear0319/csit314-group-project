// =============================================================================
// CONTROLLER: SearchShortlistC
// User story #35: "As a Customer, I want to search my shortlisted IDPs."
//
// HOW THE REQUEST TRAVELS:
//   Boundary (the web page) -> route GET /api/customer/shortlist?keyword=kitchen
//   -> SearchShortlistC.searchSaved()     <- THIS FILE
//   -> ShortlistItem.searchSaved()  (entity, reads the database)
//
// (The words const, require, class, async and return are explained at the top
// of entity/ShortlistItem.js.)
// =============================================================================

// Load the entity class that reads the shortlist_item table.
const ShortlistItem = require('../entity/ShortlistItem');

// Start of the class for story #35.
class SearchShortlistC {
  // ---------------------------------------------------------------------------
  // FUNCTION: searchSaved
  // WHAT IT DOES: finds the logged-in Customer's saved projects that match.
  // RECEIVES: customerAccountId = from the login session, never from the browser
  //           keyword           = the text after ?keyword= in the web address.
  //                               It may be missing.
  // GIVES BACK: a list of saved projects. An empty keyword lists all of them.
  // ---------------------------------------------------------------------------
  async searchSaved(customerAccountId, keyword) {
    // Someone could send ?keyword=a&keyword=b, which Express turns into a
    // list instead of text. Only accept text; treat anything else as empty.
    return ShortlistItem.searchSaved(customerAccountId, typeof keyword === 'string' ? keyword : '');
  } // End of searchSaved.
} // End of the class.

// Let other files load this class. routes/shortlist.js uses it.
module.exports = SearchShortlistC;
