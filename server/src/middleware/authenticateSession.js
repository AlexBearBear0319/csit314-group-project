const crypto = require('node:crypto');
const { Op } = require('sequelize');
const { UserAccount, UserProfile, UserSession } = require('../entity');

const COOKIE_NAME = 'csit314_session';

function cookieToken(req) {
  const header = req.get('Cookie') || '';
  const item = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function authenticateSession(req, res, next) {
  const token = cookieToken(req);
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' });

  return UserSession.findOne({
    where: { tokenHash: hashToken(token), expiresAt: { [Op.gt]: new Date() } },
    include: [{ model: UserAccount, include: [UserProfile] }],
  }).then(async (session) => {
    const account = session?.UserAccount;
    const profile = account?.UserProfile;
    if (!session || !account || account.status !== 'active' || profile?.status !== 'active') {
      if (session) await session.destroy();
      return res.status(401).json({ message: 'Sign in to continue.' });
    }

    req.auth = {
      accountId: account.id,
      username: account.username,
      name: account.name,
      role: profile.name,
    };
    req.userSession = session;
    return next();
  }).catch(next);
}

function requireRole(role) {
  return function checkRole(req, res, next) {
    if (req.auth?.role !== role) return res.status(403).json({ message: 'You cannot use this feature.' });
    return next();
  };
}

function requireCsrf(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const supplied = req.get('X-CSRF-Token') || '';
  const expected = req.userSession?.csrfToken || '';
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (!expected || suppliedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(suppliedBytes, expectedBytes)) {
    return res.status(403).json({ message: 'Refresh the page and try again.' });
  }
  return next();
}

module.exports = { COOKIE_NAME, authenticateSession, requireCsrf, requireRole, hashToken };
