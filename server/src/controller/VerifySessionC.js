// =============================================================================
// CONTROLLER: VerifySessionC              (BCE: Controller layer)
// Not a user story. It runs at the start of every request that needs a login
// (middleware/authenticateSession.js calls it) and answers one question:
// "Who is this person, and are they still allowed in?"
//
// Sequence:
//   1. the browser sends its cookie with the request
//   2. VerifySessionC.verifySession(token)                 <- THIS FILE
//        a. UserSession.findActive(hash)           find the session (not expired)
//        b. the account must be active, its profile must be active, and the
//           profile must have a role
//        c. if not, delete the session so the cookie stops working
//   3. the middleware puts the answer in req.auth for the rest of the request
// =============================================================================

const UserSession = require('../entity/UserSession');
const { sessionRole } = require('./roles');
const { hashToken } = require('./sessionTokens');

class VerifySessionC {
  // Receives: token = the cookie value, or null.
  // Returns:  { session, auth } when the person may continue, otherwise null.
  async verifySession(token) {
    if (!token) return null;

    const session = await UserSession.findActive(hashToken(token));
    const account = session?.UserAccount;
    const profile = account?.UserProfile;
    const role = sessionRole(profile?.name);

    // Suspending an account or profile blocks the user here, even if they
    // are already logged in.
    if (!session || !account || account.status !== 'active' || profile?.status !== 'active' || !role) {
      if (session) await UserSession.deleteSession(session);
      return null;
    }

    return {
      session,
      auth: {
        accountId: account.id,
        username: account.username,
        name: account.name,
        email: account.email,
        photo: account.photo,
        role,
      },
    };
  }
}

module.exports = VerifySessionC;
