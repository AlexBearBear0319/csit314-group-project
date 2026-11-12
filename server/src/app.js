// app.js — sets up Express. Kept separate from server.js so Jest can
// load the app in tests WITHOUT starting a real server.
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const routesModule = require('./routes/index.cjs');
const { allowedOrigins, requireTrustedOrigin } = require('./security/browserOrigin');
const errorHandler = require('./middleware/errorHandler');

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

const routes = resolveRouterExport(routesModule);

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
if (typeof routes !== 'function') {
  const exportKeys = routesModule && typeof routesModule === 'object'
    ? Object.keys(routesModule).join(', ')
    : typeof routesModule;
  throw new TypeError(`The API routes must export an Express router. Received: ${exportKeys}.`);
}
app.use('/api', routes);

// Every error thrown by a controller or an entity ends up here (see
// middleware/errorHandler.js). It must be registered last.
app.use(errorHandler);

module.exports = app;
