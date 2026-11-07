// =============================================================================
// CONTROLLER: SuspendUserAccountC
// User story #9: "As a User Admin, I want to suspend user accounts so that
// those users can no longer log in."
//
// HOW THE REQUEST TRAVELS:
//   Boundary (the web page) -> route POST /api/user-accounts/:id/suspend
//   -> SuspendUserAccountC.suspendAccount()    <- THIS FILE
//   -> UserAccount.suspendAccount()  (entity, saves to the database)
//
// How suspending blocks login: it sets the account's status to 'suspended'.
// UserAccount.login() and authenticateSession both refuse any account whose
// status is not 'active', so the user cannot log in or keep using an old session.
//
// (The words const, require, class, async, return and throw are explained at
// the top of CreateUserAccountC.js.)
// =============================================================================

// Load the entity class that saves to the user_account table.
const UserAccount = require('../entity/UserAccount');

// Load 2 shared helpers: the error type and the ID check.
const { RequestError, accountId } = require('./userAccountValidation');

// Start of the class for story #9.
class SuspendUserAccountC {
  // ---------------------------------------------------------------------------
  // FUNCTION: suspendAccount
  // WHAT IT DOES: suspends one account, so that person can no longer log in.
  // RECEIVES: id      = the account to suspend (from the web address, as text)
  //           adminId = the logged-in User Admin's own account ID
  // GIVES BACK: the suspended account, or null if it does not exist.
  // ---------------------------------------------------------------------------
  async suspendAccount(id, adminId) {
    // Check the ID from the web address and turn it into a number.
    const targetId = accountId(id);

    // Business rule: an admin cannot suspend themselves. Otherwise they could
    // lock themselves out, and if they were the only User Admin, nobody could
    // manage accounts any more. === means "exactly equal".
    if (targetId === adminId) throw new RequestError(409, 'You cannot suspend your own account.');

    // The rule passed, so ask the entity to suspend the account.
    return UserAccount.suspendAccount(targetId);
  } // End of suspendAccount.
} // End of the class.

// Let other files load this class. routes/userAccounts.js uses it.
module.exports = SuspendUserAccountC;
