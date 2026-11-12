// =============================================================================
// CONTROLLER: UpdateUserAccountC          (BCE: Controller layer)
// User story #8: As a User Admin, I want to update a user account so that I
// can manage platform access.
//
// Sequence for story #8:
//   1. UpdateUserAccountPg checks the form, then sends the changes here
//   2. UpdateUserAccountC.updateAccount(id, body)          <- THIS FILE
//        a. check the ID and the fields that were sent
//        b. UserAccount.viewAccount(id)            does the account exist?
//        c. UserProfile.viewProfile(profileId)     is the new profile real?
//        d. UserAccount.findDuplicates(..., id)    is the new user ID / email free?
//        e. hash the new password (only if one was sent)
//        f. UserAccount.updateAccount(id, values)  save the changes
//   3. the updated account goes back -> displaySuccess()
//
// Only the fields that are sent are changed. Sending only { name } changes the
// name and leaves the password alone.
//
// Alternative flow: reactivate a suspended account by sending
// { status: 'active' }. Sending 'suspended' is refused; suspending belongs to
// SuspendUserAccountC (story #9).
// =============================================================================

const bcrypt = require('bcryptjs');
const UserAccount = require('../entity/UserAccount');
const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');
const { accountId, checkAccountFields } = require('./userAccountValidation');

const SALT_ROUNDS = 10;

class UpdateUserAccountC {
  // Receives: id = the account ID from the web address, as text
  //           body = only the fields to change
  // Returns:  the updated account (no password).
  async updateAccount(id, body) {
    // Step 2a: check the ID and only the fields that were sent (partial).
    const targetId = accountId(id);
    const { values, errors } = checkAccountFields(body, { partial: true });

    // Step 2b: the account must exist. We check this before the other lookups.
    if (!(await UserAccount.viewAccount(targetId))) throw new RequestError(404, 'User account not found.');

    // Step 2c: a new profile must exist.
    if (values.profileId && !(await UserProfile.viewProfile(values.profileId))) {
      errors.profileId = 'Choose a user profile.';
    }
    if (Object.keys(errors).length) throw new RequestError(400, 'Check the fields and try again.', errors);

    // Step 2d: the new user ID or email must not belong to another account.
    // We pass targetId so saving your own unchanged email is not a clash.
    const duplicates = await UserAccount.findDuplicates(values, targetId);
    if (Object.keys(duplicates).length) throw new RequestError(409, 'Some details are already in use.', duplicates);

    // Step 2e: hash a new password. We never store plain text.
    if (values.password) values.password = await bcrypt.hash(values.password, SALT_ROUNDS);

    // Step 2f: save.
    return UserAccount.updateAccount(targetId, values);
  }
}

module.exports = UpdateUserAccountC;
