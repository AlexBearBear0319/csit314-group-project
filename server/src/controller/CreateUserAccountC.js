// =============================================================================
// CONTROLLER: CreateUserAccountC
// User story #6: "As a User Admin, I want to create user accounts so that
// users can join the platform."
//
// HOW THE REQUEST TRAVELS (BCE = Boundary, Controller, Entity):
//   Boundary (the web page) -> route POST /api/user-accounts
//   -> CreateUserAccountC.createAccount()      <- THIS FILE
//   -> UserAccount.createAccount()  (entity, saves to the database)
//
// A controller's job: check the input, call the entity, and turn the entity's
// answer into either a result or an error. It never touches the database itself.
//
// WORDS USED IN THIS FILE:
//   const   = give a value a name. The name keeps that value.
//   require = load code from another file so this file can use it.
//   class   = a group of related functions. A function in a class is a "method".
//   async   = this function takes time (it waits for the database).
//   await   = wait here for the slow work to finish, then carry on.
//   return  = stop the function and hand back this value.
//   throw   = stop the function and report an error.
// =============================================================================

// Load the entity class that owns the user_account table in the database.
const UserAccount = require('../entity/UserAccount');

// Load 2 shared helpers from userAccountValidation.js:
//   RequestError  = an error that also carries a web status code
//   accountValues = checks every field that the user typed
const { RequestError, accountValues } = require('./userAccountValidation');

// Start of the class. All the code for story #6 sits inside these { } brackets.
class CreateUserAccountC {
  // ---------------------------------------------------------------------------
  // FUNCTION: createAccount
  // WHAT IT DOES: checks the typed details and creates a new user account.
  // RECEIVES: body = what the page sent: { username, password, name, email,
  //           profileId, dob (optional) }
  // GIVES BACK: the new account, without its password.
  // ---------------------------------------------------------------------------
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
  } // End of createAccount.

  // ---------------------------------------------------------------------------
  // FUNCTION: listProfiles
  // WHAT IT DOES: gets the choices for the form's "User profile" dropdown.
  // USED BY: both the Create and the Update pages.
  // GIVES BACK: a list like [{ id: 3, name: 'Customer' }, ...]
  // ---------------------------------------------------------------------------
  async listProfiles() {
    // Ask the entity for the list and hand its answer straight back.
    return UserAccount.profileOptions();
  } // End of listProfiles.
} // End of the class.

// Let other files load this class. routes/userAccounts.js uses it.
module.exports = CreateUserAccountC;
