// app.js — sets up Express. Kept separate from server.js so Jest can
// load the app in tests WITHOUT starting a real server.
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const routesModule = require('./routes/index.js');
const routes = typeof routesModule === 'function' ? routesModule : routesModule.default;
const { allowedOrigins, requireTrustedOrigin } = require('./security/browserOrigin');

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
  throw new TypeError('The API routes must export an Express router.');
}
app.use('/api', routes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'The request could not be completed.' });
});

module.exports = app;
