const buckets = new Map();
let requestCount = 0;

function createRateLimiter({ scope, max, windowMs, identifier }) {
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const identity = typeof identifier === 'function' ? identifier(req) : '';
    const keys = [`${scope}:ip:${req.ip || 'unknown'}`];
    if (identity) keys.push(`${scope}:id:${String(identity).trim().toLowerCase()}`);
    const blocked = [];
    let remaining = max;
    let retryAfter = 0;

    for (const key of keys) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      remaining = Math.min(remaining, max - bucket.count);
      if (bucket.count > max) {
        blocked.push(key);
        retryAfter = Math.max(retryAfter, Math.ceil((bucket.resetAt - now) / 1000));
      }
    }

    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, remaining)));
    if (blocked.length) {
      res.set('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ message: 'Too many attempts. Wait a little and try again.' });
    }

    requestCount += 1;
    if (requestCount % 500 === 0) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }
    return next();
  };
}

const loginRateLimit = createRateLimiter({
  scope: 'login',
  max: 60,
  windowMs: 15 * 60 * 1000,
  identifier: (req) => req.body?.username,
});

const loginAccountRateLimit = createRateLimiter({
  scope: 'login-account',
  max: 10,
  windowMs: 15 * 60 * 1000,
  identifier: (req) => req.body?.username,
});

const signupRateLimit = createRateLimiter({
  scope: 'signup',
  max: 20,
  windowMs: 15 * 60 * 1000,
  identifier: (req) => req.body?.email || req.body?.username,
});

const signupIdentityRateLimit = createRateLimiter({
  scope: 'signup-identity',
  max: 5,
  windowMs: 15 * 60 * 1000,
  identifier: (req) => req.body?.email || req.body?.username,
});

function resetRateLimitsForTests() {
  buckets.clear();
  requestCount = 0;
}

module.exports = { loginRateLimit, loginAccountRateLimit, signupRateLimit, signupIdentityRateLimit, resetRateLimitsForTests };
