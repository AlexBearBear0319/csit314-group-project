// =============================================================================
// ROUTES: reports.js               (the HTTP bridge, not a BCE class)
// User stories #44-46: the Platform Manager generates a daily, weekly or
// monthly report: GET /api/reports?period=weekly&date=2026-10-01
// This file only matches the address to the controller method.
// =============================================================================

const express = require('express');
const { GenerateReportC } = require('../controller/GenerateReportC');

const router = express.Router();
const report = new GenerateReportC();

router.get('/', async (req, res) => res.json(await report.generateReport(req.query)));

module.exports = router;
