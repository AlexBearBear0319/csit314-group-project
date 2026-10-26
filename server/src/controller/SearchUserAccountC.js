// =============================================================================
// CONTROLLER: SearchUserAccountC
// User story #10: "As a User Admin, I want to search for user accounts so
// that I can quickly find a specific user."
//
// BCE flow:  Boundary (page) -> route GET /api/user-accounts?keyword=kaz
//            -> SearchUserAccountC.searchAccounts()     <- THIS FILE
//            -> UserAccount.searchAccounts()  (entity, reads the database)
// =============================================================================

const UserAccount = require('../entity/UserAccount');

class SearchUserAccountC {
  // keyword = the text after ?keyword= in the URL. It may be missing.
  // Returns a list (array) of matching accounts. An empty keyword lists all.
  async searchAccounts(keyword) {
    // Someone could send ?keyword=a&keyword=b, which Express turns into a
    // list instead of text. Only accept text; treat anything else as empty.
    return UserAccount.searchAccounts(typeof keyword === 'string' ? keyword : '');
  }
}

module.exports = SearchUserAccountC;
