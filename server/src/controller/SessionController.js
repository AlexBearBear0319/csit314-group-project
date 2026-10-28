const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { col, fn, where } = require('sequelize');
const { sequelize, UserAccount, UserProfile, UserSession } = require('../entity');
const { COOKIE_NAME, hashToken } = require('../middleware/authenticateSession');
const { canonicalRole } = UserAccount;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;
const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;

function publicAccount(account) {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    email: account.email,
    photo: account.photo || null,
    role: account.role,
  };
}

function validationError(res, errors) {
  return res.status(422).json({ message: 'Check the fields and try again.', errors });
}

function normalizeSignup(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const passwordConfirmation = typeof body.passwordConfirmation === 'string' ? body.passwordConfirmation : '';
  const errors = {};

  if (!name || name.length > 100) errors.name = 'Enter a name up to 100 characters.';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
  if (!USERNAME_PATTERN.test(username)) errors.username = 'Use 3 to 64 letters, numbers, dots, underscores or hyphens.';
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (password.length < PASSWORD_MIN_LENGTH || passwordBytes > PASSWORD_MAX_BYTES) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters and no more than ${PASSWORD_MAX_BYTES} bytes.`;
  }
  if (passwordConfirmation !== password) errors.passwordConfirmation = 'Passwords do not match.';

  return { name, email, username, password, errors };
}

function authFailureStatus(reason) {
  return reason === 'invalid' ? 401 : 403;
}

function setSessionResponse(res, account, sessionData, status = 200) {
  res.cookie(COOKIE_NAME, sessionData.token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_MS });
  res.set('Cache-Control', 'no-store');
  return res.status(status).json({
    account: publicAccount(account),
    csrfToken: sessionData.csrfToken,
    expiresAt: sessionData.expiresAt,
  });
}

async function duplicateFields(username, email) {
  const [usernameTaken, emailTaken] = await Promise.all([
    UserAccount.findOne({ where: where(fn('LOWER', fn('TRIM', col('username'))), username) }),
    UserAccount.findOne({ where: where(fn('LOWER', fn('TRIM', col('email'))), email) }),
  ]);
  const errors = {};
  if (usernameTaken) errors.username = 'This user ID is already in use.';
  if (emailTaken) errors.email = 'This email is already in use.';
  return errors;
}

class SessionController {
  static async createSession(account, transaction) {
    const token = crypto.randomBytes(32).toString('base64url');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await UserSession.create({
      accountId: account.id,
      tokenHash: hashToken(token),
      csrfToken,
      expiresAt,
    }, transaction ? { transaction } : undefined);
    return { token, csrfToken, expiresAt, session };
  }

  static async login(req, res, next) {
    try {
      const { username, password } = req.body || {};
      if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
        return res.status(422).json({ message: 'Enter your user ID and password.' });
      }

      const result = await UserAccount.login(username, password);
      if (!result.account) return res.status(authFailureStatus(result.reason)).json({ message: result.error });

      const sessionData = await SessionController.createSession(result.account);
      return setSessionResponse(res, result.account, sessionData);
    } catch (error) {
      return next(error);
    }
  }

  static registerCustomer(req, res, next) {
    return SessionController.register(req, res, next, 'Customer');
  }

  static registerDesigner(req, res, next) {
    return SessionController.register(req, res, next, 'Interior Designer');
  }

  static async register(req, res, next, roleName) {
    const values = normalizeSignup(req.body);
    if (Object.keys(values.errors).length) return validationError(res, values.errors);

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const duplicates = await duplicateFieldsInTransaction(values.username, values.email, transaction);
      if (Object.keys(duplicates).length) {
        await transaction.rollback();
        return res.status(409).json({ message: 'That account already exists.', errors: duplicates });
      }

      const profiles = await UserProfile.findAll({ transaction });
      const matchingProfiles = profiles.filter((profile) => canonicalRole(profile.name) === roleName && profile.status === 'active');
      if (matchingProfiles.length !== 1) {
        await transaction.rollback();
        return res.status(503).json({ message: `The ${roleName} profile is not ready. Ask an administrator to check the database.` });
      }

      const account = await UserAccount.create({
        username: values.username,
        password: await bcrypt.hash(values.password, SALT_ROUNDS),
        name: values.name,
        email: values.email,
        status: 'active',
        profileId: matchingProfiles[0].id,
      }, { transaction });
      const sessionData = await SessionController.createSession({ id: account.id }, transaction);
      account.role = roleName;
      await transaction.commit();
      return setSessionResponse(res, account, sessionData, 201);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback().catch(() => {});
      if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
        try {
          const conflicts = await duplicateFields(values.username, values.email);
          if (!Object.keys(conflicts).length) conflicts.username = 'This user ID or email is already in use.';
          return res.status(409).json({ message: 'That account already exists.', errors: conflicts });
        } catch (lookupError) {
          return next(lookupError);
        }
      }
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
        email: req.auth.email,
        photo: req.auth.photo,
        role: req.auth.role,
      },
      csrfToken: req.userSession.csrfToken,
      expiresAt: req.userSession.expiresAt,
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

async function duplicateFieldsInTransaction(username, email, transaction) {
  const [usernameTaken, emailTaken] = await Promise.all([
    UserAccount.findOne({ where: where(fn('LOWER', fn('TRIM', col('username'))), username), transaction }),
    UserAccount.findOne({ where: where(fn('LOWER', fn('TRIM', col('email'))), email), transaction }),
  ]);
  const errors = {};
  if (usernameTaken) errors.username = 'This user ID is already in use.';
  if (emailTaken) errors.email = 'This email is already in use.';
  return errors;
}

module.exports = SessionController;
