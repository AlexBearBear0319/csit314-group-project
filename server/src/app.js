// app.js — sets up Express. Kept separate from server.js so Jest can
// load the app in tests WITHOUT starting a real server.
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const { allowedOrigins, requireTrustedOrigin } = require('./security/browserOrigin');

function resolveRouterExport(moduleValue) {
  const pending = [moduleValue];
  const seen = new Set();

  while (pending.length) {
    const candidate = pending.shift();
    if (typeof candidate === 'function') return candidate;
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) continue;

    seen.add(candidate);
    for (const key of ['default', 'router', 'routes']) {
      if (candidate[key] !== undefined) pending.push(candidate[key]);
    }
  }

  return null;
}

function requireRouter(routesModule) {
  const routes = resolveRouterExport(routesModule);
  if (typeof routes !== 'function') {
    const exportKeys = routesModule && typeof routesModule === 'object'
      ? Object.keys(routesModule).join(', ')
      : typeof routesModule;
    throw new TypeError(`The API routes must export an Express router. Received: ${exportKeys}.`);
  }
  return routes;
}

// Vercel loads the Express entrypoint through its ESM-to-CommonJS bridge.
// Import the CommonJS router as an ES module there to preserve its exports.
const routesPromise = process.env.VERCEL
  ? import('./routes/index.cjs').then(requireRouter)
  : Promise.resolve(requireRouter(require('./routes/index.cjs')));

const app = express();

// CORS: lets the frontend (Vercel) talk to the backend (Render).
// FRONTEND_URL can hold one or more URLs separated by commas.
const origins = allowedOrigins();
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || origins.has(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  maxAge: 600,
}));

app.use(express.json({ limit: '32kb' }));
app.use('/api', requireTrustedOrigin);
app.use('/api', async (req, res, next) => {
  try {
    const routes = await routesPromise;
    return routes(req, res, next);
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'The request could not be completed.' });
});

module.exports = app;
