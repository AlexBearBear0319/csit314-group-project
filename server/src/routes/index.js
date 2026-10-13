// routes/index.js — the "order window" addresses the frontend calls.
// Each user story adds its route here and calls its CONTROLLER, e.g.
//   const SuspendUserAccountC = require('../controller/SuspendUserAccountC');
//   router.post('/user-accounts/:id/suspend', async (req, res) => { ... });
const express = require('express');
const router = express.Router();

// Health check: proves the backend is running
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
