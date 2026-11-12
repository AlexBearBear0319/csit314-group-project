// =============================================================================
// CONTROLLER: SearchUserAccountC          (BCE: Controller layer)
// User story #10: As a User Admin, I want to search for user accounts so that
// I can manage platform access.
//
// Sequence for story #10:
//   1. SearchUserAccountPg sends the keyword the admin typed
//   2. SearchUserAccountC.searchAccounts(keyword)          <- THIS FILE
//        a. make sure the keyword is plain text (and not too long)
//        b. UserAccount.searchAccounts(keyword)     find the matches
//   3. the list goes back, and the page shows it (or "no results")
// =============================================================================

const UserAccount = require('../entity/UserAccount');
const RequestError = require('./RequestError');

class SearchUserAccountC {
  // Receives: keyword = the text after ?keyword= in the address. It may be missing.
  // Returns:  a list of matching accounts. An empty keyword lists all of them.
  async searchAccounts(keyword) {
    // ?keyword=a&keyword=b arrives as a list, not text. We only accept text.
    const text = typeof keyword === 'string' ? keyword : '';
    if (text.length > 255) throw new RequestError(400, 'Enter a search term of up to 255 characters.');
    return UserAccount.searchAccounts(text);
  }
}

module.exports = SearchUserAccountC;
