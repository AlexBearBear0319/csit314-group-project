// =============================================================================
// ROUTES: userAccounts.js
// User stories #6-10: the User Admin creates, views, updates, suspends and
// searches user accounts.
//
// WHERE THIS FILE SITS (follow a request from top to bottom):
//
//   Browser (React page)
//      |  sends e.g. POST /api/user-accounts
//      v
//   app.js            -> sends every /api/... request to routes/index.cjs
//      v
//   routes/index.cjs  -> sends /api/user-accounts/... here, but only after
//      |                 3 checks: logged in, role is User Admin, CSRF token OK
//      v
//   THIS FILE         -> picks the right controller for the address
//      v
//   controller/*UserAccountC.js -> checks the input
//      v
//   entity/UserAccount.js       -> the only layer that talks to the database
//
// This file is the doorway between the web and the BCE classes. It does not
// check data or touch the database. It only:
//   1. matches an address (URL + method) to a controller method
//   2. turns the controller's answer into an HTTP response (status + JSON)
// =============================================================================

// "require" loads code from another file or package so we can use it here.
// express is the web framework. It receives requests and sends responses.
const express = require('express');

// Load the 5 controller classes, one per user story (Mr Chew's naming: ...C).
const CreateUserAccountC = require('../controller/CreateUserAccountC'); // #6
const ViewUserAccountC = require('../controller/ViewUserAccountC'); // #7
const UpdateUserAccountC = require('../controller/UpdateUserAccountC'); // #8
const SuspendUserAccountC = require('../controller/SuspendUserAccountC'); // #9
const SearchUserAccountC = require('../controller/SearchUserAccountC'); // #10

// A Router is a mini list of addresses. index.cjs attaches this whole list
// under /api/user-accounts, so '/' below means /api/user-accounts and
// '/:id' means /api/user-accounts/5 (for example).
const router = express.Router();

// Create ONE object of each controller class. "new ClassName()" builds an
// object from a class, so we can call its methods, e.g. create.createAccount().
const create = new CreateUserAccountC();
const view = new ViewUserAccountC();
const update = new UpdateUserAccountC();
const suspend = new SuspendUserAccountC();
const search = new SearchUserAccountC();

// Helper used by 4 of the 5 routes to send one account back to the browser.
//   res     = the response object Express gives us (how we reply)
//   account = what the controller returned (an account object, or null)
//   status  = the HTTP status code for success. "= 200" means: if the caller
//             does not give one, use 200 (OK). Create passes 201 (Created).
function sendAccount(res, account, status = 200) {
  // null means the controller could not find that account ID.
  // 404 = "Not Found". "return" stops the function here.
  if (!account) return res.status(404).json({ message: 'User account not found.' });

  // Otherwise send the status code and the account as JSON.
  return res.status(status).json(account);
}

// ---------------------------------------------------------------------------
// The 5 routes. Each line reads as:
//   router.<HTTP method>('<address>', async (req, res) => <what to do>)
//
//   req = the request: what the browser sent
//         req.query  = values after ? in the URL   (?keyword=kaz)
//         req.params = values in the address        (/user-accounts/:id)
//         req.body   = the JSON the browser sent    ({ "name": "..." })
//         req.auth   = who is logged in (filled in by authenticateSession)
//   res = the response: how we reply
//
//   "async" + "await": the database takes time. await pauses this function
//   until the controller has an answer, without freezing the whole server.
// ---------------------------------------------------------------------------

// #10 Search: GET /api/user-accounts?keyword=kaz
// The keyword is optional. With no keyword, every account is listed.
// res.json(...) sends status 200 with the list of accounts.
router.get('/', async (req, res) => res.json(await search.searchAccounts(req.query.keyword)));

// #6 (part) Profile choices: GET /api/user-accounts/profiles
// The list of active profiles for the form's dropdown.
// This MUST come before router.get('/:id') below. Express checks routes from
// top to bottom, and '/:id' would otherwise catch "profiles" as if it were an ID.
router.get('/profiles', async (req, res) => res.json(await create.listProfiles()));

// #6 Create: POST /api/user-accounts   body: { username, password, name, email, profileId }
// Sends status 201 ("Created") with the new account.
router.post('/', async (req, res) => sendAccount(res, await create.createAccount(req.body), 201));

// #7 View: GET /api/user-accounts/5
// req.params.id is the "5" from the address.
router.get('/:id', async (req, res) => sendAccount(res, await view.viewAccount(req.params.id)));

// #8 Update: PUT /api/user-accounts/5   body: only the fields to change
// Also reactivates a suspended account: body { "status": "active" }.
router.put('/:id', async (req, res) => sendAccount(res, await update.updateAccount(req.params.id, req.body)));

// #9 Suspend: POST /api/user-accounts/5/suspend
// req.auth.accountId is the logged-in User Admin's own ID. The controller uses
// it to stop an admin from suspending themselves.
router.post('/:id/suspend', async (req, res) => sendAccount(res, await suspend.suspendAccount(req.params.id, req.auth.accountId)));

// ---------------------------------------------------------------------------
// Error handler. Express knows this is an error handler because the function
// takes 4 arguments (error first). When any route above throws an error,
// Express skips straight to here.
// ---------------------------------------------------------------------------
router.use((error, req, res, next) => {
  // If part of a reply was already sent, we cannot send another one.
  // Pass the error on to Express's default handler.
  if (res.headersSent) return next(error);

  // Errors we created on purpose (RequestError in userAccountValidation.js)
  // carry a status: 400 bad input, 404 not found, 409 already in use.
  // Send that status, the message, and the per-field errors (if any).
  if (error.status) return res.status(error.status).json({ message: error.message, errors: error.errors });

  // Anything else is a bug or a database problem. Log the details in the
  // backend terminal for us, but only send a plain message to the browser.
  // 500 = "Internal Server Error".
  console.error('User account request failed:', error);
  return res.status(500).json({ message: 'Unable to process the user account. Try again.' });
});

// Make this router available to index.cjs, which does require('./userAccounts').
module.exports = router;
