// =============================================================================
// ROUTES: session.js               (the HTTP bridge, not a BCE class)
// Login (#11, #18, #37, #47), logout (#12, #19, #38, #48), sign-up, and "who am
// I" for the page when it first loads.
//
// The controllers do the work. This file only deals with HTTP things that a
// controller should not know about: the cookie that holds the session token,
// and the cache headers.
// =============================================================================

const express = require('express');
const UserLoginC = require('../controller/UserLoginC');
const UserLogoutC = require('../controller/UserLogoutC');
const RegisterAccountC = require('../controller/RegisterAccountC');
const { SESSION_TTL_MS } = require('../controller/sessionTokens');
const { COOKIE_NAME, authenticateSession, requireCsrf } = require('../middleware/authenticateSession');
const {
  loginRateLimit, loginAccountRateLimit, signupRateLimit, signupIdentityRateLimit,
} = require('../middleware/rateLimit');

const router = express.Router();
const login = new UserLoginC();
const logout = new UserLogoutC();
const register = new RegisterAccountC();

// The session cookie. httpOnly = page scripts cannot read it. In production it
// must be 'secure' (https only) and 'none' because the website and the API are
// on different domains.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};

// Sends the account and CSRF token to the page, and the session token to the cookie.
function sendSession(res, result, status = 200) {
  res.cookie(COOKIE_NAME, result.token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_MS });
  res.set('Cache-Control', 'no-store');
  return res.status(status).json({
    account: result.account,
    csrfToken: result.csrfToken,
    expiresAt: result.expiresAt,
  });
}

// Login: POST /api/login   body: { username, password }
router.post('/login', loginRateLimit, loginAccountRateLimit, async (req, res) => {
  const { username, password } = req.body || {};
  return sendSession(res, await login.login(username, password));
});

// Sign-up: POST /api/register/customer and /api/register/designer
router.post('/register/customer', signupRateLimit, signupIdentityRateLimit, async (req, res) =>
  sendSession(res, await register.registerCustomer(req.body), 201));
router.post('/register/designer', signupRateLimit, signupIdentityRateLimit, async (req, res) =>
  sendSession(res, await register.registerDesigner(req.body), 201));

// Who am I: GET /api/session. The page calls this when it loads, to see if the
// cookie still belongs to a live session. authenticateSession already did the
// work, so we only repeat what it found.
router.get('/session', authenticateSession, (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json({
    account: {
      id: req.auth.accountId,
      username: req.auth.username,
      name: req.auth.name,
      email: req.auth.email,
      photo: req.auth.photo,
      role: req.auth.role,
    },
    csrfToken: req.userSession.csrfToken,
    expiresAt: req.userSession.expiresAt,
  });
});

// Logout: DELETE /api/session
router.delete('/session', authenticateSession, requireCsrf, async (req, res) => {
  const result = await logout.logout(req.userSession);
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.set('Cache-Control', 'no-store');
  return res.json(result);
});

module.exports = router;
