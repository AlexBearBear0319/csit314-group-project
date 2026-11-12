// =============================================================================
// CONTROLLER: CreateUserAccountC          (BCE: Controller layer)
// User story #6: As a User Admin, I want to create a user account so that I
// can manage platform access.
//
// Sequence for story #6:
//   1. CreateUserAccountPg checks the form, then sends the values here
//   2. CreateUserAccountC.createAccount(body)             <- THIS FILE
//        a. check the fields again (a second line of defence)
//        b. UserProfile.viewProfile(profileId)     is the profile real?
//        c. UserAccount.findDuplicates(...)        is the user ID / email free?
//        d. hash the password with bcrypt
//        e. UserAccount.createAccount(values)      save the account
//   3. the new account (no password) goes back to the page -> displaySuccess()
//
// CreateUserAccountC.listProfiles() fills the "User profile" dropdown on the
// Create and Update pages.
// =============================================================================

const bcrypt = require('bcryptjs');
const UserAccount = require('../entity/UserAccount');
const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');
const { checkAccountFields } = require('./userAccountValidation');

const SALT_ROUNDS = 10; // how much work bcrypt does. Higher is slower to crack.

class CreateUserAccountC {
  // Receives: body = { username, password, name, email, profileId, dob (optional) }
  // Returns:  the new account, without its password.
  async createAccount(body) {
    // Step 2a: check every field. We collect all the problems first.
    const { values, errors } = checkAccountFields(body);

    // Step 2b: the chosen profile must exist. This needs the database, so it is
    // checked here and not in the field rules.
    if (!errors.profileId && !(await UserProfile.viewProfile(values.profileId))) {
      errors.profileId = 'Choose a user profile.';
    }
    if (Object.keys(errors).length) throw new RequestError(400, 'Check the fields and try again.', errors);

    // Step 2c: the user ID and email must not belong to someone else.
    const duplicates = await UserAccount.findDuplicates(values);
    if (Object.keys(duplicates).length) throw new RequestError(409, 'Some details are already in use.', duplicates);

    // Step 2d: never store a plain-text password.
    values.password = await bcrypt.hash(values.password, SALT_ROUNDS);

    // Step 2e: save. The entity answers with the safe fields of the new account.
    return UserAccount.createAccount(values);
  }

  // Returns the profiles for the dropdown, for example [{ id: 3, name: 'Customer' }].
  async listProfiles() {
    return UserProfile.listActiveOptions();
  }
}

module.exports = CreateUserAccountC;
