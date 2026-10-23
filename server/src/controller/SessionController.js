const crypto = require('node:crypto');
const { UserAccount, UserSession } = require('../entity');
const { COOKIE_NAME, hashToken } = require('../middleware/authenticateSession');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};

function publicAccount(account) {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.profile,
  };
}

class SessionController {
  static async login(req, res, next) {
    try {
      const { username, password, profile } = req.body || {};
      if (![username, password, profile].every((value) => typeof value === 'string' && value.trim())) {
        return res.status(422).json({ message: 'Enter your user ID, password and profile.' });
      }

      const result = await UserAccount.login(username.trim(), password, profile.trim());
      if (!result.account) return res.status(401).json({ message: result.error });

      const token = crypto.randomBytes(32).toString('base64url');
      const csrfToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await UserSession.create({
        accountId: result.account.id,
        tokenHash: hashToken(token),
        csrfToken,
        expiresAt,
      });

      res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_MS });
      res.set('Cache-Control', 'no-store');
      return res.json({ account: publicAccount(result.account), csrfToken });
    } catch (error) {
      return next(error);
    }
  }

  static current(req, res) {
    res.set('Cache-Control', 'no-store');
    return res.json({
      account: {
        id: req.auth.accountId,
        username: req.auth.username,
        name: req.auth.name,
        role: req.auth.role,
      },
      csrfToken: req.userSession.csrfToken,
    });
  }

  static async logout(req, res, next) {
    try {
      await req.userSession.destroy();
      res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
      res.set('Cache-Control', 'no-store');
      return res.json({ loggedOut: true });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = SessionController;
