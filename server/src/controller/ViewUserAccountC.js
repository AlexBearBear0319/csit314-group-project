// =============================================================================
// CONTROLLER: ViewUserAccountC
// User story #7: "As a User Admin, I want to view a user account so that I
// can check its details."
//
// BCE flow:  Boundary (page) -> route GET /api/user-accounts/:id
//            -> ViewUserAccountC.viewAccount()          <- THIS FILE
//            -> UserAccount.viewAccount()  (entity, reads the database)
// =============================================================================

const UserAccount = require('../entity/UserAccount');

// accountId turns the "5" from the URL into the number 5, or throws 404 if
// it cannot be a real ID (e.g. "abc").
const { accountId } = require('./userAccountValidation');

class ViewUserAccountC {
  // id = the ID from the URL, as text.
  // Returns the account, or null if no account has that ID. The route turns
  // null into 404 Not Found.
  async viewAccount(id) {
    return UserAccount.viewAccount(accountId(id));
  }
}

module.exports = ViewUserAccountC;
