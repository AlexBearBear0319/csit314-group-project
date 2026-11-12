// =============================================================================
// ROUTES: designerIdpStats.js      (the HTTP bridge, not a BCE class)
// User stories #30 and #31: an Interior Designer sees the view count and the
// shortlist count of their own project. This file only matches an address to a
// controller method.
// =============================================================================

const express = require('express');
const ViewIDPViewCountC = require('../controller/ViewIDPViewCountC'); // #30
const ViewIDPShortlistCountC = require('../controller/ViewIDPShortlistCountC'); // #31

const router = express.Router();
const viewCount = new ViewIDPViewCountC();
const shortlistCount = new ViewIDPShortlistCountC();

// #30: GET /api/designer/idps/5/view-count
router.get('/:id/view-count', async (req, res) =>
  res.json(await viewCount.viewIDPViewCount(req.auth.accountId, req.params.id)));

// #31: GET /api/designer/idps/5/shortlist-count
router.get('/:id/shortlist-count', async (req, res) =>
  res.json(await shortlistCount.viewIDPShortlistCount(req.auth.accountId, req.params.id)));

module.exports = router;
