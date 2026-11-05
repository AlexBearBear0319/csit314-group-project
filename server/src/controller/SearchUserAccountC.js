// =============================================================================
// CONTROLLER: SearchUserAccountC
// User story #10: "As a User Admin, I want to search for user accounts so
// that I can quickly find a specific user."
//
// HOW THE REQUEST TRAVELS:
//   Boundary (the web page) -> route GET /api/user-accounts?keyword=kaz
//   -> SearchUserAccountC.searchAccounts()     <- THIS FILE
//   -> UserAccount.searchAccounts()  (entity, reads the database)
//
// (The words const, require, class, async and return are explained at the top
// of CreateUserAccountC.js.)
// =============================================================================

// Load the entity class that reads the user_account table.
const UserAccount = require('../entity/UserAccount');

// Start of the class for story #10.
class SearchUserAccountC {
  // ---------------------------------------------------------------------------
  // FUNCTION: searchAccounts
  // WHAT IT DOES: finds the accounts that match the search text.
  // RECEIVES: keyword = the text after ?keyword= in the web address. It may be
  //           missing.
  // GIVES BACK: a list of matching accounts. An empty keyword lists all of them.
  // ---------------------------------------------------------------------------
  async searchAccounts(keyword) {
    // Someone could send ?keyword=a&keyword=b, which Express turns into a
    // list instead of text. Only accept text; treat anything else as empty.
    return UserAccount.searchAccounts(typeof keyword === 'string' ? keyword : '');
  } // End of searchAccounts.
} // End of the class.

// Let other files load this class. routes/userAccounts.js uses it.
module.exports = SearchUserAccountC;
