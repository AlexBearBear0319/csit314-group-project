// =============================================================================
// CONTROLLER: RegisterAccountC            (BCE: Controller layer)
// Sign-up for a Customer or an Interior Designer. This is the self-service
// way to get an account. (A User Admin creates accounts with CreateUserAccountC.)
//
// Sequence for sign-up:
//   1. RegisterPg checks the form, then sends the values
//   2. RegisterAccountC.registerCustomer / registerDesigner(body)   <- THIS FILE
//        a. check every field, and that the two passwords match
//        b. UserAccount.findDuplicates(...)        is the user ID / email free?
//        c. UserProfile.listProfiles()             find the one active profile
//           for this role
//        d. hash the password
//        e. UserAccount.createAccountWithSession   save the account AND its first
//           session together, so nothing half-finished is left behind
//   3. { account, token, csrfToken } goes back, and the user is logged in
// =============================================================================

const bcrypt = require('bcryptjs');
const UserAccount = require('../entity/UserAccount');
const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');
const { canonicalRole } = require('./roles');
const { newSession } = require('./sessionTokens');
const {
  EMAIL_PATTERN, PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, USERNAME_PATTERN,
} = require('./userAccountValidation');

const SALT_ROUNDS = 10;

class RegisterAccountC {
  async registerCustomer(body) {
    return this.register(body, 'Customer');
  }

  async registerDesigner(body) {
    return this.register(body, 'Interior Designer');
  }

  // Receives: body = { name, email, username, password, passwordConfirmation }
  //           roleName = 'Customer' or 'Interior Designer'
  // Returns:  { account, token, csrfToken, expiresAt }
  async register(body, roleName) {
    // Step 2a: check the fields.
    const values = this.checkSignup(body);

    // Step 2b: the user ID and email must be free.
    const duplicates = await UserAccount.findDuplicates(values);
    if (Object.keys(duplicates).length) throw new RequestError(409, 'That account already exists.', duplicates);

    // Step 2c: sign-up needs exactly one active profile for the role.
    const profiles = await UserProfile.listProfiles();
    const matching = profiles.filter((profile) => canonicalRole(profile.name) === roleName && profile.status === 'active');
    if (matching.length !== 1) {
      throw new RequestError(503, `The ${roleName} profile is not ready. Ask an administrator to check the database.`);
    }

    // Steps 2d and 2e: hash the password, then save the account and session.
    const { token, sessionValues } = newSession();
    let account;
    try {
      account = await UserAccount.createAccountWithSession({
        username: values.username,
        password: await bcrypt.hash(values.password, SALT_ROUNDS),
        name: values.name,
        email: values.email,
        status: 'active',
        profileId: matching[0].id,
      }, sessionValues);
    } catch (error) {
      // Someone else took the same user ID or email a moment ago. We look again
      // so the page can show which box is the problem.
      if (UserAccount.isConflictError(error)) {
        const conflicts = await UserAccount.findDuplicates(values);
        if (!Object.keys(conflicts).length) conflicts.username = 'This user ID or email is already in use.';
        throw new RequestError(409, 'That account already exists.', conflicts);
      }
      throw error;
    }

    return {
      account: {
        id: account.id,
        username: account.username,
        name: account.name,
        email: account.email,
        photo: account.photo || null,
        role: roleName,
      },
      token,
      csrfToken: sessionValues.csrfToken,
      expiresAt: sessionValues.expiresAt,
    };
  }

  // The sign-up rules. RegisterPg checks the same rules before it sends the form.
  // Returns the clean values, or throws one 422 error listing every problem.
  checkSignup(body = {}) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const passwordConfirmation = typeof body.passwordConfirmation === 'string' ? body.passwordConfirmation : '';
    const errors = {};

    if (!name || name.length > 100) errors.name = 'Enter a name up to 100 characters.';
    if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
    if (!USERNAME_PATTERN.test(username)) errors.username = 'Use 3 to 64 letters, numbers, dots, underscores or hyphens.';
    if (password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
      errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters and no more than ${PASSWORD_MAX_BYTES} bytes.`;
    }
    if (passwordConfirmation !== password) errors.passwordConfirmation = 'Passwords do not match.';

    if (Object.keys(errors).length) throw new RequestError(422, 'Check the fields and try again.', errors);
    return { name, email, username, password };
  }
}

module.exports = RegisterAccountC;
