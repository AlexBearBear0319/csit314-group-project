// =============================================================================
// CONTROLLER: CreateUserAccountC
// User story #6: "As a User Admin, I want to create user accounts so that
// users can join the platform."
//
// BCE flow:  Boundary (page) -> route POST /api/user-accounts
//            -> CreateUserAccountC.createAccount()      <- THIS FILE
//            -> UserAccount.createAccount()  (entity, saves to the database)
//
// A controller's job: check the input, call the entity, and turn the entity's
// answer into either a result or an error. It never touches the database itself.
// =============================================================================

// The entity class that owns the user_account table.
const UserAccount = require('../entity/UserAccount');

// Shared helpers: RequestError (an error with a status code) and
// accountValues (checks every field). See userAccountValidation.js.
const { RequestError, accountValues } = require('./userAccountValidation');

class CreateUserAccountC {
  // body = the JSON the page sent: { username, password, name, email, profileId, dob? }
  // Returns the new account (without its password).
  async createAccount(body) {
    // Step 1: check and clean every field. If anything is wrong, accountValues
    // throws a 400 error and this method stops here.
    const values = await accountValues(body);

    // Step 2: ask the entity to save it. The entity answers with either
    //   { account: {...} }                    -> saved
    //   { conflict: { username: '...' } }     -> user ID or email already used
    const result = await UserAccount.createAccount(values);

    // Step 3: a conflict becomes 409 ("Conflict"), with the field messages so
    // the page can show "This user ID is already in use." under the right box.
    if (result.conflict) throw new RequestError(409, 'Some details are already in use.', result.conflict);

    // Step 4: success. The route sends this back with status 201 (Created).
    return result.account;
  }

  // The list of profiles for the form's "User profile" dropdown.
  // Returns [{ id, name }, ...]. Used by both the Create and Update pages.
  async listProfiles() {
    return UserAccount.profileOptions();
  }
}

// Let routes/userAccounts.js load this class.
module.exports = CreateUserAccountC;
