// =============================================================================
// CONTROLLER: UpdateUserAccountC
// User story #8: "As a User Admin, I want to update user accounts so that
// users' information stays up to date."
//
// HOW THE REQUEST TRAVELS:
//   Boundary (the web page) -> route PUT /api/user-accounts/:id
//   -> UpdateUserAccountC.updateAccount()      <- THIS FILE
//   -> UserAccount.updateAccount()  (entity, saves to the database)
//
// Only the fields that are sent get changed. For example, sending only
// { "name": "New Name" } changes the name and leaves the password alone.
//
// Alternative flow: REACTIVATE a suspended account by sending
// { "status": "active" }. The user can then log in again. Sending
// "suspended" is refused (use SuspendUserAccountC, story #9).
// The status check lives in accountValues (userAccountValidation.js).
//
// (The words const, require, class, async, await, return and throw are
// explained at the top of CreateUserAccountC.js.)
// =============================================================================

// Load the entity class that saves to the user_account table.
const UserAccount = require('../entity/UserAccount');

// Load 3 shared helpers: the error type, the ID check and the field checks.
const { RequestError, accountId, accountValues } = require('./userAccountValidation');

// Start of the class for story #8.
class UpdateUserAccountC {
  // ---------------------------------------------------------------------------
  // FUNCTION: updateAccount
  // WHAT IT DOES: checks the changes and saves them to one account.
  // RECEIVES: id   = the account ID from the web address, as text
  //           body = only the fields to change, such as { name, email,
  //                  profileId, password, status }
  // GIVES BACK: the updated account, or null if the account does not exist.
  // ---------------------------------------------------------------------------
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
  } // End of updateAccount.
} // End of the class.

// Let other files load this class. routes/userAccounts.js uses it.
module.exports = UpdateUserAccountC;
