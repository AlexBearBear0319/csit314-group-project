// =============================================================================
// CONTROLLER: UpdateUserAccountC
// User story #8: "As a User Admin, I want to update user accounts so that
// users' information stays up to date."
//
// BCE flow:  Boundary (page) -> route PUT /api/user-accounts/:id
//            -> UpdateUserAccountC.updateAccount()      <- THIS FILE
//            -> UserAccount.updateAccount()  (entity, saves to the database)
//
// Only the fields that are sent get changed. For example, sending only
// { "name": "New Name" } changes the name and leaves the password alone.
//
// Alternative flow: REACTIVATE a suspended account by sending
// { "status": "active" }. The user can then log in again. Sending
// "suspended" is refused (use SuspendUserAccountC, story #9).
// The status check lives in accountValues (userAccountValidation.js).
// =============================================================================

const UserAccount = require('../entity/UserAccount');
const { RequestError, accountId, accountValues } = require('./userAccountValidation');

class UpdateUserAccountC {
  // id   = the account ID from the URL, as text
  // body = only the fields to change, e.g. { name, email, profileId, password, status }
  // Returns the updated account, or null if the account does not exist.
  async updateAccount(id, body) {
    // Step 1: check only the fields that were sent ({ partial: true }).
    const values = await accountValues(body, { partial: true });

    // Step 2: ask the entity to update. It answers with
    //   null                    -> no account with this ID
    //   { conflict: {...} }     -> the new user ID or email belongs to someone else
    //   { account: {...} }      -> saved
    const result = await UserAccount.updateAccount(accountId(id), values);

    // Step 3: pass "not found" on as null (the route sends 404) ...
    if (!result) return null;

    // ... turn a conflict into 409 ...
    if (result.conflict) throw new RequestError(409, 'Some details are already in use.', result.conflict);

    // ... or return the updated account (the route sends 200 OK).
    return result.account;
  }
}

module.exports = UpdateUserAccountC;
