// =============================================================================
// CONTROLLER: SuspendUserAccountC         (BCE: Controller layer)
// User story #9: As a User Admin, I want to suspend a user account so that I
// can manage platform access.
//
// Sequence for story #9:
//   1. SuspendUserAccountPg asks the User Admin to confirm, then sends the ID
//   2. SuspendUserAccountC.suspendAccount(id, adminId)     <- THIS FILE
//        a. check the ID
//        b. business rule: an admin cannot suspend their own account
//        c. UserAccount.viewAccount(id)             does the account exist?
//        d. UserAccount.suspendAccount(id)          set status = 'suspended'
//   3. the suspended account goes back -> displaySuccess()
//
// How suspending blocks a user: the status becomes 'suspended'. UserLoginC and
// VerifySessionC both refuse accounts that are not 'active', so the user cannot
// log in and an old session stops working.
// =============================================================================

const UserAccount = require('../entity/UserAccount');
const RequestError = require('./RequestError');
const { accountId } = require('./userAccountValidation');

class SuspendUserAccountC {
  // Receives: id      = the account to suspend (from the web address, as text)
  //           adminId = the logged-in User Admin's own account ID
  // Returns:  the suspended account.
  async suspendAccount(id, adminId) {
    const targetId = accountId(id);

    // Business rule: an admin who suspends themselves would be locked out, and
    // if they were the only User Admin, nobody could manage accounts any more.
    if (targetId === adminId) throw new RequestError(409, 'You cannot suspend your own account.');

    if (!(await UserAccount.viewAccount(targetId))) throw new RequestError(404, 'User account not found.');

    return UserAccount.suspendAccount(targetId);
  }
}

module.exports = SuspendUserAccountC;
