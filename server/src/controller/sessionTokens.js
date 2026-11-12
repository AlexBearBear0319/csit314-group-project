// =============================================================================
// CONTROLLER HELPER: sessionTokens
// Makes and hashes the secret values of a login session.
//
//   token     = random text kept in the browser cookie. It proves who you are.
//   tokenHash = a SHA-256 hash of the token. This is what we store, so a leaked
//               database table cannot be used to log in.
//   csrfToken = a second random value the page sends in a header on every
//               change. It stops other websites from using your cookie.
//
// Used by UserLoginC, RegisterAccountC (to start a session) and
// VerifySessionC (to find the session again).
// =============================================================================

const crypto = require('node:crypto');

// A session lasts 8 hours.
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Builds a brand new session.
// Returns { token, sessionValues }:
//   token         goes to the browser cookie
//   sessionValues { tokenHash, csrfToken, expiresAt } goes to the entity to save
function newSession() {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  return { token, sessionValues: { tokenHash: hashToken(token), csrfToken, expiresAt } };
}

module.exports = { SESSION_TTL_MS, hashToken, newSession };
