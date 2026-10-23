const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function allowedOrigins() {
  const configured = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(configured.map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return '';
    }
  }).filter(Boolean));
}

function isTrustedOrigin(origin) {
  return Boolean(origin) && allowedOrigins().has(origin);
}

function requireTrustedOrigin(req, res, next) {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  if (!isTrustedOrigin(req.get('Origin'))) {
    return res.status(403).json({ message: 'This request did not come from the app.' });
  }
  return next();
}

module.exports = { allowedOrigins, isTrustedOrigin, requireTrustedOrigin };
