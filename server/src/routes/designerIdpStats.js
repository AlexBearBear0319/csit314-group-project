// ROUTES for stories #30 and #31 (IDP view count and shortlist count).
// They are mounted at /api/designer/idps in routes/index.cjs, after the login,
// role and CSRF checks, so req.auth.accountId is always a logged-in designer.
const router = require('express').Router();
const viewCount = new (require('../controller/ViewIDPViewCountC'))();
const shortlistCount = new (require('../controller/ViewIDPShortlistCountC'))();

// #30  GET /api/designer/idps/5/view-count
router.get('/:id/view-count', async (req, res, next) => {
  try {
    const result = await viewCount.viewIDPViewCount(req.auth.accountId, req.params.id);
    // Not found and "belongs to someone else" look the same on purpose.
    if (!result) return res.status(404).json({ message: 'Project not found.' });
    return res.json(result);
  } catch (error) { return next(error); }
});

// #31  GET /api/designer/idps/5/shortlist-count
router.get('/:id/shortlist-count', async (req, res, next) => {
  try {
    const result = await shortlistCount.viewIDPShortlistCount(req.auth.accountId, req.params.id);
    if (!result) return res.status(404).json({ message: 'Project not found.' });
    return res.json(result);
  } catch (error) { return next(error); }
});

// A bad project id throws an error with status 400. Turn it into a 400 reply.
router.use((error, req, res, next) => {
  if (error.status === 400) return res.status(400).json({ message: error.message });
  return next(error);
});

module.exports = router;
