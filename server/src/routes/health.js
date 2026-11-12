// =============================================================================
// ROUTES: health.js                (the HTTP bridge, not a BCE class)
// Not a user story. Two addresses for checking that the backend is alive:
//   GET /api/health        -> the server is running
//   GET /api/health/ready  -> the database, tables and image storage are ready
// =============================================================================

const express = require('express');
const CheckSystemStatusC = require('../controller/CheckSystemStatusC');

const router = express.Router();
const status = new CheckSystemStatusC();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.get('/health/ready', async (req, res) => {
  const { ready, body } = await status.checkReady();
  return res.status(ready ? 200 : 503).json(body);
});

module.exports = router;
