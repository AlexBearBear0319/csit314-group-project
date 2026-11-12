// =============================================================================
// ROUTES: designerIdps.js          (the HTTP bridge, not a BCE class)
// User stories #20-29: an Interior Designer creates, views, updates, deletes and
// searches their current and past IDPs, and manages the photos of a project.
//
// Current and past projects use the same controllers. Only the status differs, so
// one function builds the routes for both:
//   /api/designer/current-idps/...   status = 'current'  (stories #20-24)
//   /api/designer/past-idps/...      status = 'past'     (stories #25-29)
//
// req.auth.accountId is the logged-in designer, read from the server session.
// No address accepts an owner from the browser.
// =============================================================================

const express = require('express');
const CreateDesignerIDPC = require('../controller/CreateDesignerIDPC'); // #20, #25
const ViewDesignerIDPC = require('../controller/ViewDesignerIDPC'); // #21, #26
const UpdateDesignerIDPC = require('../controller/UpdateDesignerIDPC'); // #22, #27
const DeleteDesignerIDPC = require('../controller/DeleteDesignerIDPC'); // #23, #28
const SearchDesignerIDPC = require('../controller/SearchDesignerIDPC'); // #24, #29
const ManageIDPImageC = require('../controller/ManageIDPImageC'); // photos

const create = new CreateDesignerIDPC();
const view = new ViewDesignerIDPC();
const update = new UpdateDesignerIDPC();
const remove = new DeleteDesignerIDPC();
const search = new SearchDesignerIDPC();
const images = new ManageIDPImageC();

// Builds the router for one status.
function idpRouter(status) {
  const router = express.Router();

  // Search + list: GET /?q=&sort=&page=
  router.get('/', async (req, res) => res.json(await search.searchIDPs(req.auth.accountId, status, req.query)));
  // Create: POST /
  router.post('/', async (req, res) => res.status(201).json(await create.createIDP(req.auth.accountId, status, req.body)));
  // View: GET /5
  router.get('/:id', async (req, res) => res.json(await view.viewIDP(req.auth.accountId, status, req.params.id)));
  // Update: PUT /5
  router.put('/:id', async (req, res) => res.json(await update.updateIDP(req.auth.accountId, status, req.params.id, req.body)));
  // Delete: DELETE /5
  router.delete('/:id', async (req, res) => res.json(await remove.deleteIDP(req.auth.accountId, status, req.params.id)));

  // Photos. The upload link must not be cached by the browser.
  router.post('/:id/images/upload-url', async (req, res) => {
    const result = await images.createUploadUrl(req.auth.accountId, status, req.params.id, req.body);
    res.set('Cache-Control', 'no-store');
    return res.status(201).json(result);
  });
  router.delete('/:id/images/uploads/:intentId', async (req, res) =>
    res.json(await images.cancelUpload(req.auth.accountId, status, req.params.id, req.params.intentId)));
  router.post('/:id/images/:intentId/complete', async (req, res) =>
    res.status(201).json(await images.completeUpload(req.auth.accountId, status, req.params.id, req.params.intentId)));
  router.patch('/:id/images/:imageId', async (req, res) =>
    res.json(await images.updateImage(req.auth.accountId, status, req.params.id, req.params.imageId, req.body)));
  router.delete('/:id/images/:imageId', async (req, res) =>
    res.json(await images.deleteImage(req.auth.accountId, status, req.params.id, req.params.imageId)));

  return router;
}

module.exports = {
  currentIdps: idpRouter('current'),
  pastIdps: idpRouter('past'),
  // The categories dropdown for the project form.
  listCategories: async (req, res) => res.json(await create.listCategories()),
};
