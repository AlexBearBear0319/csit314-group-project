// =============================================================================
// CONTROLLER: UserLoginC                  (BCE: Controller layer)
// User stories #11, #18, #37, #47: a User Admin, Interior Designer, Customer
// and Platform Manager can log in. All four roles use the same login.
//
// Sequence for login:
//   1. UserLoginPg checks that both boxes are filled, then sends the values
//   2. UserLoginC.login(username, password)                <- THIS FILE
//        a. check that a user ID and a password were sent
//        b. UserAccount.findForLogin(username)     read the account + profile
//        c. check the password with bcrypt
//        d. check the account is active, and the profile is active and has a role
//        e. UserSession.createSession(...)         start the session
//   3. { account, token, csrfToken } goes back. The route puts the token in a
//      cookie, and the page opens the home screen of the role.
//
// Every wrong user ID or password gets the same message, so nobody can use it
// to find out which user IDs exist.
// =============================================================================

const bcrypt = require('bcryptjs');
const UserAccount = require('../entity/UserAccount');
const UserSession = require('../entity/UserSession');
const RequestError = require('./RequestError');
const { sessionRole } = require('./roles');
const { newSession } = require('./sessionTokens');

// A bcrypt hash looks like $2b$10$ followed by 53 characters.
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

class UserLoginC {
  // Receives: username, password = what the user typed.
  // Returns:  { account, token, csrfToken, expiresAt } when the login is fine.
  // Throws:   401 for a wrong user ID or password, 403 for a blocked account.
  async login(username, password) {
    // Step 2a: both boxes must be filled in.
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
      throw new RequestError(422, 'Enter your user ID and password.');
    }

    // Step 2b: read the matching account. We expect exactly one.
    const accounts = await UserAccount.findForLogin(username);
    const invalid = new RequestError(401, 'Wrong user ID or password.');
    if (accounts.length !== 1) throw invalid;
    const account = accounts[0];

    // Step 2c: check the password. A password that is not a bcrypt hash means
    // someone typed it into the database by hand. We refuse it (reset it with
    // the provisioning script instead).
    if (!BCRYPT_HASH.test(account.password)) throw invalid;
    if (!(await bcrypt.compare(password, account.password))) throw invalid;

    // Step 2d: the account and its profile must both be active.
    if (account.status !== 'active') throw new RequestError(403, 'This account is suspended.');
    const profile = account.UserProfile;
    if (!profile) throw new RequestError(403, 'Your account role is not set. Contact an administrator.');
    if (profile.status !== 'active') throw new RequestError(403, 'This user profile is suspended.');

    // The role is the profile name. A profile a User Admin made (story #1) is
    // not one of the 4 built-in roles, but its accounts can still log in.
    const role = sessionRole(profile.name);
    if (!role) throw new RequestError(403, 'Your account role is not recognized. Contact an administrator.');

    // Step 2e: start the session. We save the hash, and give the token back.
    const { token, sessionValues } = newSession();
    await UserSession.createSession({ ...sessionValues, accountId: account.id });

    return {
      account: {
        id: account.id,
        username: account.username,
        name: account.name,
        email: account.email,
        photo: account.photo || null,
        role,
      },
      token,
      csrfToken: sessionValues.csrfToken,
      expiresAt: sessionValues.expiresAt,
    };
  }
}

module.exports = UserLoginC;
