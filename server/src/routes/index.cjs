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
const { loginRateLimit, loginAccountRateLimit, signupRateLimit, signupIdentityRateLimit } = require('../middleware/rateLimit');
const { sequelize } = require('../entity');
const { checkStorageReady } = require('../storage/IdpImageStorage');

const REQUIRED_COLUMNS = {
  idp_category: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
  user_profile: ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'],
  user_account: ['id', 'username', 'password', 'name', 'email', 'dob', 'photo', 'status', 'profileId', 'createdAt', 'updatedAt'],
  user_session: ['id', 'account_id', 'token_hash', 'csrf_token', 'expires_at', 'created_at', 'updated_at'],
  interior_design_project: ['id', 'name', 'description', 'property_type', 'design_style', 'status', 'completion_date', 'designer_account_id', 'created_at', 'updated_at'],
  project_image: ['id', 'project_id', 'storage_path', 'file_name', 'content_type', 'size_bytes', 'alt_text', 'sort_order', 'created_at', 'updated_at'],
  idp_image_upload_intent: ['id', 'project_id', 'designer_account_id', 'storage_path', 'file_name', 'content_type', 'size_bytes', 'alt_text', 'expires_at', 'created_at', 'updated_at'],
  idp_image_cleanup_task: ['id', 'designer_account_id', 'storage_path', 'attempts', 'last_error', 'created_at', 'updated_at'],
};

// Health check: proves the backend is running
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/health/ready', async (req, res) => {
  const checks = { api: 'ok', database: 'unavailable', schema: 'unknown', storage: 'unavailable' };
  const schemaIssues = [];
  try {
    await sequelize.authenticate();
    checks.database = 'ok';
    const tables = await sequelize.getQueryInterface().showAllTables();
    const names = new Set(tables.map((table) => (typeof table === 'string' ? table : table.tableName)));
    checks.schema = 'ok';
    for (const [table, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
      if (!names.has(table)) {
        schemaIssues.push({ table, missingTable: true, missingColumns: [] });
        continue;
      }
      const columns = await sequelize.getQueryInterface().describeTable(table);
      const missingColumns = requiredColumns.filter((column) => !Object.hasOwn(columns, column));
      if (missingColumns.length) {
        schemaIssues.push({ table, missingTable: false, missingColumns });
      }
    }
    if (schemaIssues.some((issue) => issue.missingTable)) checks.schema = 'missing_tables';
    else if (schemaIssues.length) checks.schema = 'missing_columns';
  } catch {
    checks.schema = 'unknown';
  }

  try {
    checks.storage = await checkStorageReady() ? 'ok' : 'not_configured';
  } catch {
    checks.storage = 'unavailable';
  }

  const ready = checks.database === 'ok' && checks.schema === 'ok' && checks.storage === 'ok';
  return res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks, schemaIssues });
});

router.post('/login', loginRateLimit, loginAccountRateLimit, SessionController.login);
router.post('/register/customer', signupRateLimit, signupIdentityRateLimit, SessionController.registerCustomer);
router.post('/register/designer', signupRateLimit, signupIdentityRateLimit, SessionController.registerDesigner);
router.get('/session', authenticateSession, SessionController.current);
router.delete('/session', authenticateSession, requireCsrf, SessionController.logout);

// User Admin: user account stories #6-10 (routes are in ./userAccounts.js).
// router.use(address, check1, check2, check3, routes) runs the checks in order
// for EVERY request that starts with /api/user-accounts. If a check fails, it
// replies with an error and the request never reaches the routes.
//   authenticateSession       -> is someone logged in? reads the session cookie
//                                and puts their details in req.auth (else 401)
//   requireRole('User Admin') -> is req.auth.role "User Admin"? (else 403)
//   requireCsrf               -> for changes (POST/PUT/PATCH/DELETE): does the
//                                X-CSRF-Token header match the session? (else 403)
//                                This stops other websites sending requests
//                                with the admin's cookie.
// All 3 checks were written by Alex in middleware/authenticateSession.js.
router.use('/user-accounts', authenticateSession, requireRole('User Admin'), requireCsrf, require('./userAccounts'));

// Christy's stories #1-5 and #39-43 use the shared session and CSRF checks.
router.use('/user-profiles', authenticateSession, requireRole('User Admin'), requireCsrf, require('./userProfiles'));
router.use('/idp-categories', authenticateSession, requireRole('Platform Manager'), requireCsrf, require('./idpCategories'));

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

// Use a named export so Vercel's module wrapper can keep the router when it
// loads this CommonJS module from the Express service entrypoint.
module.exports = { router };
