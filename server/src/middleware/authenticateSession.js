// BCE: Outside BCE (HTTP middleware).
// Resolves the session from the request and attaches verified account context for protected routes.

// =============================================================================
// MIDDLEWARE: authenticateSession
// Three small checks that run BEFORE a route reaches its controller. routes/
// index.cjs puts them in front of each group of routes.
//
//   authenticateSession -> is someone logged in? (401 if not)
//   requireRole(role)   -> is it the right role for this feature? (403 if not)
//   requireCsrf         -> for changes (POST/PUT/PATCH/DELETE): does the
//                          X-CSRF-Token header match the session? (403 if not)
//                          This stops other websites from sending requests
//                          with the user's cookie.
//
// The "is this session real?" decision is made by VerifySessionC. This file
// only reads the cookie and passes the result on.
// =============================================================================

const crypto = require('node:crypto');
const VerifySessionC = require('../controller/VerifySessionC');

const COOKIE_NAME = 'csit314_session';
const verifySession = new VerifySessionC();

// Reads our session cookie out of the Cookie header. Returns null if missing.
function cookieToken(req) {
  // Read the cookie header before looking up the application session cookie.
  const header = req.get('Cookie') || '';
  const item = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

async function authenticateSession(req, res, next) {
  try {
    const result = await verifySession.verifySession(cookieToken(req));
    if (!result) return res.status(401).json({ message: 'Sign in to continue.' });

    // The rest of the request can read who is logged in from req.auth.
    req.auth = result.auth;
    req.userSession = result.session;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(role) {
  return function checkRole(req, res, next) {
    if (req.auth?.role !== role) return res.status(403).json({ message: 'You cannot use this feature.' });
    return next();
  };
}

function requireCsrf(req, res, next) {
  // Apply the CSRF token check to requests that can change server state.
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const supplied = req.get('X-CSRF-Token') || '';
  const expected = req.userSession?.csrfToken || '';
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  // timingSafeEqual compares in constant time, so the response time cannot
  // be used to guess the token.
  // Reject a missing or mismatched token and compare equal-length tokens in constant time.
  if (!expected || suppliedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(suppliedBytes, expectedBytes)) {
    return res.status(403).json({ message: 'Refresh the page and try again.' });
  }
  return next();
}

module.exports = { COOKIE_NAME, authenticateSession, requireCsrf, requireRole };
