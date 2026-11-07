// =============================================================================
// CONTROLLER: ViewUserAccountC
// User story #7: "As a User Admin, I want to view a user account so that I
// can check its details."
//
// HOW THE REQUEST TRAVELS:
//   Boundary (the web page) -> route GET /api/user-accounts/:id
//   -> ViewUserAccountC.viewAccount()          <- THIS FILE
//   -> UserAccount.viewAccount()  (entity, reads the database)
//
// (The words const, require, class, async and return are explained at the top
// of CreateUserAccountC.js.)
// =============================================================================

// Load the entity class that reads the user_account table.
const UserAccount = require('../entity/UserAccount');

// Load the accountId helper. It turns the "5" from the web address into the
// number 5, or reports 404 (not found) if it cannot be a real ID, such as "abc".
const { accountId } = require('./userAccountValidation');

// Start of the class for story #7.
class ViewUserAccountC {
  // ---------------------------------------------------------------------------
  // FUNCTION: viewAccount
  // WHAT IT DOES: finds one account by its ID.
  // RECEIVES: id = the ID from the web address, as text.
  // GIVES BACK: the account, or null ("nothing") if no account has that ID.
  //             The route turns null into 404 Not Found.
  // ---------------------------------------------------------------------------
  async viewAccount(id) {
    // First check the ID, then ask the entity for that account.
    return UserAccount.viewAccount(accountId(id));
  } // End of viewAccount.
} // End of the class.

// Let other files load this class. routes/userAccounts.js uses it.
module.exports = ViewUserAccountC;
