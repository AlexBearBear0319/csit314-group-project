// app.js — sets up Express. Kept separate from server.js so Jest can
// load the app in tests WITHOUT starting a real server.
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// CORS: lets the frontend (Vercel) talk to the backend (Render).
// FRONTEND_URL can hold one or more URLs separated by commas.
const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim());
app.use(cors({ origin: allowed }));

app.use(express.json());
app.use('/api', routes);

module.exports = app;
