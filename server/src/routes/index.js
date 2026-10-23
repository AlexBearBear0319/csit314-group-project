// routes/index.js — the "order window" addresses the frontend calls.
// Each user story adds its route here and calls its CONTROLLER, e.g.
//   const SuspendUserAccountC = require('../controller/SuspendUserAccountC');
//   router.post('/user-accounts/:id/suspend', async (req, res) => { ... });
const express = require('express');
const router = express.Router();
const SessionController = require('../controller/SessionController');
const { IdpController } = require('../controller/IdpController');
const IdpImageController = require('../controller/IdpImageController');
const { authenticateSession, requireCsrf, requireRole } = require('../middleware/authenticateSession');
const { sequelize } = require('../entity');
const { checkStorageReady } = require('../storage/IdpImageStorage');

const REQUIRED_COLUMNS = {
  user_profile: ['id', 'name', 'status'],
  user_account: ['id', 'username', 'password', 'name', 'status', 'profileId'],
  user_session: ['id', 'account_id', 'token_hash', 'csrf_token', 'expires_at'],
  interior_design_project: ['id', 'name', 'description', 'property_type', 'design_style', 'status', 'completion_date', 'designer_account_id'],
  project_image: ['id', 'project_id', 'storage_path', 'file_name', 'content_type', 'size_bytes', 'alt_text', 'sort_order'],
  idp_image_upload_intent: ['id', 'project_id', 'designer_account_id', 'storage_path', 'file_name', 'content_type', 'size_bytes', 'alt_text', 'expires_at'],
  idp_image_cleanup_task: ['id', 'designer_account_id', 'storage_path', 'attempts', 'last_error'],
};

// Health check: proves the backend is running
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/health/ready', async (req, res) => {
  const checks = { api: 'ok', database: 'unavailable', schema: 'unknown', storage: 'unavailable' };
  try {
    await sequelize.authenticate();
    checks.database = 'ok';
    const tables = await sequelize.getQueryInterface().showAllTables();
    const names = new Set(tables.map((table) => (typeof table === 'string' ? table : table.tableName)));
    checks.schema = 'ok';
    for (const [table, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
      if (!names.has(table)) {
        checks.schema = 'missing_tables';
        break;
      }
      const columns = await sequelize.getQueryInterface().describeTable(table);
      if (requiredColumns.some((column) => !Object.hasOwn(columns, column))) {
        checks.schema = 'missing_columns';
        break;
      }
    }
  } catch {
    checks.schema = 'unknown';
  }

  try {
    checks.storage = await checkStorageReady() ? 'ok' : 'not_configured';
  } catch {
    checks.storage = 'unavailable';
  }

  const ready = checks.database === 'ok' && checks.schema === 'ok' && checks.storage === 'ok';
  return res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
});

router.post('/login', SessionController.login);
router.get('/session', authenticateSession, SessionController.current);
router.delete('/session', authenticateSession, requireCsrf, SessionController.logout);

// Every Interior Designer action uses the account and role read from the
// server-side session. No route accepts an owner ID from the browser.
router.use('/designer', authenticateSession, requireRole('Interior Designer'), requireCsrf);

router.get('/designer/current-idps', IdpController.searchCurrentIdps);
router.post('/designer/current-idps', IdpController.createCurrentIdp);
router.get('/designer/current-idps/:id', IdpController.viewCurrentIdp);
router.put('/designer/current-idps/:id', IdpController.updateCurrentIdp);
router.delete('/designer/current-idps/:id', IdpController.deleteCurrentIdp);
router.post('/designer/current-idps/:id/images/upload-url', (req, res, next) => IdpImageController.createUploadUrl(req, res, next, 'current'));
router.delete('/designer/current-idps/:id/images/uploads/:intentId', (req, res, next) => IdpImageController.cancelUpload(req, res, next, 'current'));
router.post('/designer/current-idps/:id/images/:intentId/complete', (req, res, next) => IdpImageController.completeUpload(req, res, next, 'current'));
router.patch('/designer/current-idps/:id/images/:imageId', (req, res, next) => IdpImageController.updateImage(req, res, next, 'current'));
router.delete('/designer/current-idps/:id/images/:imageId', (req, res, next) => IdpImageController.deleteImage(req, res, next, 'current'));

router.get('/designer/past-idps', IdpController.searchPastIdps);
router.post('/designer/past-idps', IdpController.createPastIdp);
router.get('/designer/past-idps/:id', IdpController.viewPastIdp);
router.put('/designer/past-idps/:id', IdpController.updatePastIdp);
router.delete('/designer/past-idps/:id', IdpController.deletePastIdp);
router.post('/designer/past-idps/:id/images/upload-url', (req, res, next) => IdpImageController.createUploadUrl(req, res, next, 'past'));
router.delete('/designer/past-idps/:id/images/uploads/:intentId', (req, res, next) => IdpImageController.cancelUpload(req, res, next, 'past'));
router.post('/designer/past-idps/:id/images/:intentId/complete', (req, res, next) => IdpImageController.completeUpload(req, res, next, 'past'));
router.patch('/designer/past-idps/:id/images/:imageId', (req, res, next) => IdpImageController.updateImage(req, res, next, 'past'));
router.delete('/designer/past-idps/:id/images/:imageId', (req, res, next) => IdpImageController.deleteImage(req, res, next, 'past'));

module.exports = router;
