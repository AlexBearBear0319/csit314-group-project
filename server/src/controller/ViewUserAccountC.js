// =============================================================================
// CONTROLLER: ViewUserAccountC            (BCE: Controller layer)
// User story #7: As a User Admin, I want to view a user account so that I can
// manage platform access.
//
// Sequence for story #7:
//   1. ViewUserAccountPg opens and asks for account :id
//   2. ViewUserAccountC.viewAccount(id)                    <- THIS FILE
//        a. check the ID is a real whole number
//        b. UserAccount.viewAccount(id)            read the account
//        c. no account found -> 404 "User account not found."
//   3. the account goes back to the page, which shows the details
// =============================================================================

const UserAccount = require('../entity/UserAccount');
const RequestError = require('./RequestError');
const { accountId } = require('./userAccountValidation');

class ViewUserAccountC {
  // Receives: id = the ID from the web address, as text.
  // Returns:  the account's safe fields (no password).
  async viewAccount(id) {
    const account = await UserAccount.viewAccount(accountId(id));
    if (!account) throw new RequestError(404, 'User account not found.');
    return account;
  }
}

module.exports = ViewUserAccountC;
