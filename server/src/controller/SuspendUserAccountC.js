// =============================================================================
// CONTROLLER: SuspendUserAccountC
// User story #9: "As a User Admin, I want to suspend user accounts so that
// those users can no longer log in."
//
// BCE flow:  Boundary (page) -> route POST /api/user-accounts/:id/suspend
//            -> SuspendUserAccountC.suspendAccount()    <- THIS FILE
//            -> UserAccount.suspendAccount()  (entity, saves to the database)
//
// How suspending blocks login: it sets the account's status to 'suspended'.
// UserAccount.login() and authenticateSession both refuse any account whose
// status is not 'active', so the user cannot log in or keep using an old session.
// =============================================================================

const UserAccount = require('../entity/UserAccount');
const { RequestError, accountId } = require('./userAccountValidation');

class SuspendUserAccountC {
  // id      = the account to suspend (from the URL, as text)
  // adminId = the logged-in User Admin's own account ID (from req.auth)
  // Returns the suspended account, or null if it does not exist.
  async suspendAccount(id, adminId) {
    const targetId = accountId(id);

    // Business rule: an admin cannot suspend themselves. Otherwise they could
    // lock themselves out, and if they were the only User Admin, nobody could
    // manage accounts any more. === means "exactly equal".
    if (targetId === adminId) throw new RequestError(409, 'You cannot suspend your own account.');

    return UserAccount.suspendAccount(targetId);
  }
}

module.exports = SuspendUserAccountC;
