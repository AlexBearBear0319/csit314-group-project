// =============================================================================
// ROUTES: userAccounts.js          (the HTTP bridge, not a BCE class)
// User stories #6-10: the User Admin creates, views, updates, suspends and
// searches user accounts.
//
// A request travels like this:
//   Boundary (React page) -> api.js sends e.g. POST /api/user-accounts
//   -> app.js -> routes/index.cjs (login, role and CSRF checks)
//   -> THIS FILE -> the controller of the story -> the entity -> the database
//
// Why a route file at all? The browser can only talk HTTP, and the controllers
// are plain classes. This file only matches an address (URL + method) to the
// controller method. It makes no decisions:
//   - checking input, 404 and 409 are the controller's job
//   - turning an error into a reply is done once in middleware/errorHandler.js
// =============================================================================

const express = require('express');

const CreateUserAccountC = require('../controller/CreateUserAccountC'); // #6
const ViewUserAccountC = require('../controller/ViewUserAccountC'); // #7
const UpdateUserAccountC = require('../controller/UpdateUserAccountC'); // #8
const SuspendUserAccountC = require('../controller/SuspendUserAccountC'); // #9
const SearchUserAccountC = require('../controller/SearchUserAccountC'); // #10

// index.cjs mounts this router at /api/user-accounts, so '/' below means
// /api/user-accounts and '/:id' means /api/user-accounts/5.
const router = express.Router();

// One object per controller. We create them once and reuse them.
const create = new CreateUserAccountC();
const view = new ViewUserAccountC();
const update = new UpdateUserAccountC();
const suspend = new SuspendUserAccountC();
const search = new SearchUserAccountC();

// req.query = values after ? in the URL, req.params = values in the address,
// req.body = the JSON the page sent, req.auth = who is logged in.

// #10 Search: GET /api/user-accounts?keyword=sam
router.get('/', async (req, res) => res.json(await search.searchAccounts(req.query.keyword)));

// #6 (part) Dropdown choices: GET /api/user-accounts/profiles
// This must stay ABOVE '/:id', or Express would read "profiles" as an ID.
router.get('/profiles', async (req, res) => res.json(await create.listProfiles()));

// #6 Create: POST /api/user-accounts
router.post('/', async (req, res) => res.status(201).json(await create.createAccount(req.body)));

// #7 View: GET /api/user-accounts/5
router.get('/:id', async (req, res) => res.json(await view.viewAccount(req.params.id)));

// #8 Update: PUT /api/user-accounts/5   (also reactivates with { status: 'active' })
router.put('/:id', async (req, res) => res.json(await update.updateAccount(req.params.id, req.body)));

// #9 Suspend: POST /api/user-accounts/5/suspend
// req.auth.accountId is the admin's own ID, so the controller can refuse a
// self-suspend.
router.post('/:id/suspend', async (req, res) => res.json(await suspend.suspendAccount(req.params.id, req.auth.accountId)));

module.exports = router;
