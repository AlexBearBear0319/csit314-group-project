// =============================================================================
// ROUTES: shortlist.js
// User stories #34-36: a Customer saves, searches and views shortlisted IDPs.
//
// routes/index.cjs sends /api/customer/shortlist/... here, but only after 3
// checks: logged in, role is Customer, CSRF token OK.
//
// This file does not check data or touch the database. It only:
//   1. matches an address (URL + method) to a controller method
//   2. turns the controller's answer into an HTTP response (status + JSON)
//
// req.auth.accountId is the logged-in Customer, read from the server session.
// No route accepts an owner from the browser, so nobody can use another
// Customer's shortlist.
// =============================================================================

// Load express, the web framework that receives requests and sends responses.
const express = require('express');

// Load the 3 controller classes, one per user story.
const SaveShortlistC = require('../controller/SaveShortlistC'); // #34
const SearchShortlistC = require('../controller/SearchShortlistC'); // #35
const ViewShortlistC = require('../controller/ViewShortlistC'); // #36

// A Router is a mini list of addresses. '/' below means /api/customer/shortlist.
const router = express.Router();

// Create ONE object of each controller class, so we can call its methods.
const save = new SaveShortlistC();
const search = new SearchShortlistC();
const view = new ViewShortlistC();

// =============================================================================
// THE 3 ROUTES. Each line reads as:
//   router.<HTTP method>('<address>', async (req, res) => <what to do>)
//   req = what the browser sent. res = how we reply.
// =============================================================================

// ---- ROUTE: View my shortlist and Search my shortlist -------------------------
// GET /api/customer/shortlist            -> everything saved
// GET /api/customer/shortlist?keyword=kitchen -> only the matches
// With ?keyword= in the address the Customer is searching. Without it they are
// opening My Shortlist, so they get everything they saved.
router.get('/', async (req, res) => {
  const searching = Object.hasOwn(req.query, 'keyword');
  const list = searching
    ? await search.searchSaved(req.auth.accountId, req.query.keyword)
    : await view.viewShortlist(req.auth.accountId);
  return res.json(list);
});

// ---- ROUTE: #34 Save ---------------------------------------------------------
// POST /api/customer/shortlist   body: { projectId }
router.post('/', async (req, res) => {
  // Ask the controller to save the project.
  const project = await save.saveProject(req.auth.accountId, req.body);
  // null means no project has this ID. 404 = "Not Found".
  if (!project) return res.status(404).json({ message: 'This project is not available.' });
  // Saved. 201 = "Created".
  return res.status(201).json(project);
});

// ---- ROUTE: #36 View ---------------------------------------------------------
// GET /api/customer/shortlist/5. req.params.id is the "5" from the address.
router.get('/:id', async (req, res) => {
  // Ask the controller for the saved project.
  const project = await view.viewSaved(req.auth.accountId, req.params.id);
  // null means this Customer did not save it. 404 = "Not Found".
  if (!project) return res.status(404).json({ message: 'This project is not in your shortlist.' });
  // Found. res.json sends status 200 with the project.
  return res.json(project);
});

// =============================================================================
// FUNCTION: error handler
// WHAT IT DOES: Express knows this is an error handler because the function
// takes 4 arguments (error first). When any route above throws an error,
// Express skips straight to here.
// =============================================================================
router.use((error, req, res, next) => {
  // If part of a reply was already sent, we cannot send another one.
  if (res.headersSent) return next(error);

  // Errors we created on purpose (RequestError) carry a status. Send that status,
  // the message, and the per-field errors (if any).
  if (error.status) return res.status(error.status).json({ message: error.message, errors: error.errors });

  // Anything else is a bug or a database problem. Log the details in the
  // backend terminal for us, but only send a plain message to the browser.
  console.error('Shortlist request failed:', error);
  // 500 = "Internal Server Error".
  return res.status(500).json({ message: 'Unable to process your shortlist. Try again.' });
}); // End of the error handler.

// Make this router available to index.cjs, which does require('./shortlist').
module.exports = router;
