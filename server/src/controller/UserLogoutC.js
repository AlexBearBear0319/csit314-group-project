// =============================================================================
// CONTROLLER: UserLogoutC                 (BCE: Controller layer)
// User stories #12, #19, #38, #48: every role can log out.
//
// Sequence for logout:
//   1. the page asks the user to log out and sends DELETE /api/session
//   2. UserLogoutC.logout(session)                         <- THIS FILE
//        a. UserSession.deleteSession(session)     remove the session row
//   3. the route clears the cookie, and the page goes back to the login page
//
// After this, the old cookie finds no session, so it cannot be used again.
// =============================================================================

const UserSession = require('../entity/UserSession');

class UserLogoutC {
  // Receives: session = the session row of the logged-in user (found by
  //           VerifySessionC on this request).
  // Returns:  { loggedOut: true }
  async logout(session) {
    await UserSession.deleteSession(session);
    return { loggedOut: true };
  }
}

module.exports = UserLogoutC;
