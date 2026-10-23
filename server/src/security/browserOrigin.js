const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function allowedOrigins() {
  const configured = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = configured.map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return '';
    }
  });

  // Vercel's server and client services share the incoming deployment host.
  // Allow the current deployment URL and the project's production URL when
  // FRONTEND_URL is not set in the Vercel environment.
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean);
  const vercelOrigins = vercelHosts.map((host) => {
    try {
      return new URL(`https://${host}`).origin;
    } catch {
      return '';
    }
  });

  return new Set([...origins, ...vercelOrigins].filter(Boolean));
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
