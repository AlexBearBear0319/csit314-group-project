const router = require('express').Router();
const viewCount = new (require('../controller/ViewIDPViewCountC'))();
const shortlistCount = new (require('../controller/ViewIDPShortlistCountC'))();

// Stories #30 and #31. The designer comes from the server session, never the request.
// GET /api/designer/idps/:id/view-count
router.get('/:id/view-count', async (req, res, next) => {
  try {
    const result = await viewCount.viewIDPViewCount(req.auth.accountId, req.params.id);
    if (!result) return res.status(404).json({ message: 'Project not found.' });
    return res.json(result);
  } catch (error) { return next(error); }
});
// GET /api/designer/idps/:id/shortlist-count
router.get('/:id/shortlist-count', async (req, res, next) => {
  try {
    const result = await shortlistCount.viewIDPShortlistCount(req.auth.accountId, req.params.id);
    if (!result) return res.status(404).json({ message: 'Project not found.' });
    return res.json(result);
  } catch (error) { return next(error); }
});
router.use((error, req, res, next) => {
  if (error.status === 400) return res.status(400).json({ message: error.message });
  return next(error);
});
module.exports = router;
