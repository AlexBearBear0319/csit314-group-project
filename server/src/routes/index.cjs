// =============================================================================
// ROUTES: index.cjs                (the HTTP bridge, not a BCE class)
// The map of every address the website can call (everything under /api).
//
// For each group of addresses we list the checks that run FIRST, in order:
//   authenticateSession       is someone logged in?       (401 if not)
//   requireRole('...')        is it the right role?       (403 if not)
//   requireCsrf               for changes, is the CSRF token right? (403 if not)
// A request that fails a check never reaches the controller.
//
// Each route file below only matches an address to a controller method.
// =============================================================================

const express = require('express');
const { authenticateSession, requireCsrf, requireRole } = require('../middleware/authenticateSession');
const { currentIdps, pastIdps, listCategories } = require('./designerIdps');

const router = express.Router();

// Health checks, login, logout, sign-up (they set up their own checks).
router.use(require('./health'));
router.use(require('./session'));

// User Admin: user profiles (#1-5) and user accounts (#6-10).
router.use('/user-profiles', authenticateSession, requireRole('User Admin'), requireCsrf, require('./userProfiles'));
router.use('/user-accounts', authenticateSession, requireRole('User Admin'), requireCsrf, require('./userAccounts'));

// Platform Manager: IDP categories (#39-43) and reports (#44-46).
router.use('/idp-categories', authenticateSession, requireRole('Platform Manager'), requireCsrf, require('./idpCategories'));
router.use('/reports', authenticateSession, requireRole('Platform Manager'), require('./reports'));

// Interior Designer: company information (#13-17).
router.use('/companies', authenticateSession, requireRole('Interior Designer'), requireCsrf, require('./companies'));

// Interior Designer: projects (#20-29) and statistics (#30, #31). Every action
// uses the account and role from the server session, and no address accepts an
// owner from the browser.
router.use('/designer', authenticateSession, requireRole('Interior Designer'), requireCsrf);
router.get('/designer/categories', listCategories);
router.use('/designer/idps', require('./designerIdpStats'));
router.use('/designer/current-idps', currentIdps);
router.use('/designer/past-idps', pastIdps);

// Customer: search and view IDPs (#32, #33) and the shortlist (#34-36).
router.use('/customer/idps', authenticateSession, requireRole('Customer'), requireCsrf, require('./customerIdps'));
router.use('/customer/shortlist', authenticateSession, requireRole('Customer'), requireCsrf, require('./shortlist'));

// A named export, so Vercel's module wrapper keeps the router when it loads this
// CommonJS file.
module.exports = { router };
