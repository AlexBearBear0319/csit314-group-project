// =============================================================================
// ROUTES: customerIdps.js          (the HTTP bridge, not a BCE class)
// User stories #32 and #33: a Customer searches IDPs and views one.
// This file only matches an address to a controller method.
// =============================================================================

const express = require('express');
const SearchIDPC = require('../controller/SearchIDPC'); // #32
const ViewIDPC = require('../controller/ViewIDPC'); // #33

const router = express.Router();
const search = new SearchIDPC();
const view = new ViewIDPC();

// The choices for the filter dropdowns: GET /api/customer/idps/filters
router.get('/filters', async (req, res) => res.json(await search.listFilters()));

// #32 Search and #33 View (list): GET /api/customer/idps[?keyword=&propertyType=&designStyle=&page=&sort=]
// If any search value is in the address the Customer is searching. Otherwise they
// are just browsing the list.
router.get('/', async (req, res) => {
  const searching = ['keyword', 'propertyType', 'designStyle'].some((key) => Object.hasOwn(req.query, key));
  return res.json(searching ? await search.searchIDPs(req.query) : await view.browseIDPs(req.query));
});

// #33 View (one project): POST /api/customer/idps/5/view
// It is a POST because opening a project changes data: it adds 1 to the view count.
router.post('/:id/view', async (req, res) => res.json(await view.viewIDP(req.params.id)));

module.exports = router;
