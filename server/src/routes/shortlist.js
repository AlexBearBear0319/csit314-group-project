// =============================================================================
// ROUTES: shortlist.js             (the HTTP bridge, not a BCE class)
// User stories #34-36: a Customer saves, searches and views shortlisted IDPs.
//
// routes/index.cjs sends /api/customer/shortlist/... here, but only after 3
// checks: logged in, role is Customer, CSRF token OK.
//
// This file only matches an address to a controller method. req.auth.accountId
// is the logged-in Customer, read from the server session. No address accepts an
// owner from the browser, so nobody can use another Customer's shortlist.
// =============================================================================

const express = require('express');

const SaveShortlistC = require('../controller/SaveShortlistC'); // #34
const SearchShortlistC = require('../controller/SearchShortlistC'); // #35
const ViewShortlistC = require('../controller/ViewShortlistC'); // #36

const router = express.Router();
const save = new SaveShortlistC();
const search = new SearchShortlistC();
const view = new ViewShortlistC();

// #35 Search and #36 View (list): GET /api/customer/shortlist[?keyword=kitchen]
// With ?keyword= in the address the Customer is searching. Without it they are
// opening My Shortlist, so we send everything they saved.
router.get('/', async (req, res) => {
  const searching = Object.hasOwn(req.query, 'keyword');
  return res.json(searching
    ? await search.searchSaved(req.auth.accountId, req.query.keyword)
    : await view.viewShortlist(req.auth.accountId));
});

// #34 Save: POST /api/customer/shortlist   body: { projectId }
router.post('/', async (req, res) => res.status(201).json(await save.saveProject(req.auth.accountId, req.body)));

// #36 View (one project): GET /api/customer/shortlist/5
router.get('/:id', async (req, res) => res.json(await view.viewSaved(req.auth.accountId, req.params.id)));

module.exports = router;
