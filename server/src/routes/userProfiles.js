// BCE: Boundary (HTTP entry point).
// Connects userProfiles HTTP requests to controller operations and translates their outcomes into responses.

// =============================================================================
// ROUTES: userProfiles.js          (the HTTP bridge, not a BCE class)
// User stories #1-5: the User Admin creates, views, updates, suspends and
// searches user profiles. Same rule as the other route files: match an address
// to a controller method and nothing else. The controllers make the decisions.
// =============================================================================

const express = require('express');

const CreateUserProfileC = require('../controller/CreateUserProfileC'); // #1
const ViewUserProfileC = require('../controller/ViewUserProfileC'); // #2
const UpdateUserProfileC = require('../controller/UpdateUserProfileC'); // #3
const SuspendUserProfileC = require('../controller/SuspendUserProfileC'); // #4
const SearchUserProfileC = require('../controller/SearchUserProfileC'); // #5

const router = express.Router();
const create = new CreateUserProfileC();
const view = new ViewUserProfileC();
const update = new UpdateUserProfileC();
const suspend = new SuspendUserProfileC();
const search = new SearchUserProfileC();

router.get('/', async (req, res) => res.json(await search.searchProfiles(req.query.keyword))); // #5
router.post('/', async (req, res) => res.status(201).json(await create.createProfile(req.body))); // #1
router.get('/:id', async (req, res) => res.json(await view.viewProfile(req.params.id))); // #2
router.put('/:id', async (req, res) => res.json(await update.updateProfile(req.params.id, req.body))); // #3
router.post('/:id/suspend', async (req, res) => res.json(await suspend.suspendProfile(req.params.id))); // #4
router.post('/:id/activate', async (req, res) => res.json(await suspend.activateProfile(req.params.id))); // #4 alternative flow

// Expose this module’s entry points to its callers.
module.exports = router;
