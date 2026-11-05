// =============================================================================
// TESTS: userAccounts.test.js
// Unit tests for User Admin user account stories #6-10.
// These were written BEFORE the code (TDD): they all failed first (red), then
// the code was written until they all passed (green).
//
// HOW TO RUN (from the server folder):
//   npx jest tests/userAccounts.test.js     <- only these tests
//   npm test                                <- every test in the project
//
// HOW THE TESTS WORK
// - Jest is the test runner. It finds "test(...)" blocks and runs each one.
// - Supertest sends fake web requests to the backend without starting a real
//   server or opening a browser.
// - When NODE_ENV is "test", db.js uses a temporary database that lives in
//   memory (SQLite). The real Supabase database is NEVER touched.
//
// EVERY TEST HAS 3 PARTS
//   1. a name    - a sentence saying what should happen
//   2. an action - send a request
//   3. a check   - expect(actual).toBe(expected). If they differ, the test fails.
//
// Each test matches a flow in the use case description: the basic flow (it
// works) or an alternative flow (duplicate, missing account, not allowed ...).
//
// STATUS CODES THE TESTS CHECK:
//   200 OK, 201 Created, 400 Bad Request (wrong input), 401 Not logged in or
//   wrong password, 403 Not allowed, 404 Not Found, 409 Conflict (already in use)
// =============================================================================

const bcrypt = require('bcryptjs'); // to hash the test passwords
const request = require('supertest'); // to send fake requests
const app = require('../src/app'); // the backend itself
const { sequelize, UserProfile, UserAccount } = require('../src/entity'); // database classes
const { resetRateLimitsForTests } = require('../src/middleware/rateLimit'); // Alex's login limiter

// Alex's security check only accepts changes (POST/PUT) that say they came
// from the app's own address, so every test request sets this Origin header.
const ORIGIN = 'http://localhost:5173';

const PASSWORD = 'password123'; // password of the 2 starting accounts
const NEW_PASSWORD = 'new-password-1234'; // 12+ characters, as the rules require

// "let" variables that every test can use. beforeEach fills them in.
let adminProfile; // the User Admin role
let customerProfile; // the Customer role
let designerProfile; // the Interior Designer role
let admin; // the starting User Admin account
let customer; // the starting Customer account

// =============================================================================
// FUNCTION: startSession (helper)
// WHAT IT DOES: logs in and keeps the session, like a browser would.
// request.agent(app) is a fake browser that remembers cookies between requests.
// The login reply includes a CSRF token, which every change request must send.
// GIVES BACK: { client, csrfToken, response } so tests can use all three.
// =============================================================================
async function startSession(username, password = PASSWORD) {
  // Make a fake browser.
  const client = request.agent(app);
  // Send the login request with the user ID and password, and wait for the reply.
  const response = await client.post('/api/login').set('Origin', ORIGIN).send({ username, password });
  // Hand back the fake browser, the security token and the login reply.
  return { client, csrfToken: response.body.csrfToken, response };
} // End of startSession.

// =============================================================================
// FUNCTION: send (helper)
// WHAT IT DOES: sends a request as the logged-in user.
//   session - from startSession
//   method  - 'get', 'post' or 'put'
//   path    - e.g. '/user-accounts/5'  (/api is added here)
//   body    - optional JSON to send
// session.client[method] picks the right function: client.get, client.post ...
// =============================================================================
function send(session, method, path, body) {
  // Prepare the request, with the Origin header the security check needs.
  let req = session.client[method](`/api${path}`).set('Origin', ORIGIN);
  // Add the security token, if this session has one.
  if (session.csrfToken) req = req.set('X-CSRF-Token', session.csrfToken);
  // Add the data to send, if there is any.
  if (body !== undefined) req = req.send(body);
  // Hand back the request. The test decides when to wait for it.
  return req;
} // End of send.

// =============================================================================
// FUNCTION: newAccount (helper)
// WHAT IT DOES: gives the fields of a valid new account. Tests can change any field:
//   newAccount({ username: 'customer1' })  -> same as below, but that user ID.
// { ...defaults, ...values } copies the defaults, then overwrites with values.
// =============================================================================
function newAccount(values = {}) {
  return {
    username: 'new.user', // a valid user ID
    password: NEW_PASSWORD, // a valid password
    name: 'New User', // a valid name
    email: 'new.user@example.com', // a valid email
    profileId: customerProfile.id, // the Customer role
    ...values, // any field the test wants to change replaces the one above
  };
} // End of newAccount.

// =============================================================================
// SETUP: beforeEach runs before EVERY test, so every test starts from the same
// data and one test can never break another.
// =============================================================================
beforeEach(async () => {
  resetRateLimitsForTests(); // Alex's code blocks too many logins; reset the counter
  await sequelize.sync({ force: true }); // wipe and recreate all tables (memory database only)

  // Create 3 profiles (roles). Promise.all runs the 3 creates together and
  // waits for all of them. [a, b, c] = ... takes the 3 results in order.
  [adminProfile, customerProfile, designerProfile] = await Promise.all([
    UserProfile.create({ name: 'User Admin' }), // role 1
    UserProfile.create({ name: 'Customer' }), // role 2
    UserProfile.create({ name: 'Interior Designer' }), // role 3
  ]);

  // Hash the password once. Cost 4 instead of 10 keeps the tests fast.
  const hash = await bcrypt.hash(PASSWORD, 4);

  // Create 2 starting accounts: one User Admin and one Customer.
  [admin, customer] = await Promise.all([
    UserAccount.create({ username: 'admin1', password: hash, name: 'Demo Admin', email: 'admin1@example.com', profileId: adminProfile.id }),
    UserAccount.create({ username: 'customer1', password: hash, name: 'Demo Customer', email: 'customer1@example.com', profileId: customerProfile.id }),
  ]);
}); // End of the setup.

// =============================================================================
// CLEAN-UP: afterAll runs once at the very end: close the database so Jest can exit.
// =============================================================================
afterAll(async () => {
  await sequelize.close();
});

// =============================================================================
// describe(...) groups related tests under one heading in the test output.
// =============================================================================

// =============================================================================
// TEST GROUP: Access control
// Only a logged-in User Admin may use these features (the 3 checks in index.cjs).
// =============================================================================
describe('Access control', () => {
  // TEST: someone who has not logged in is refused.
  test('a visitor who is not logged in is rejected', async () => {
    // No startSession: no cookie. .expect(401) checks the status code.
    await request(app).get('/api/user-accounts').expect(401);
  });

  // TEST: a logged-in Customer is refused, because the role is wrong.
  test('a logged-in user who is not a User Admin is rejected', async () => {
    const session = await startSession('customer1'); // log in as the Customer
    const res = await send(session, 'get', '/user-accounts'); // try to list accounts
    expect(res.status).toBe(403); // 403 Forbidden: logged in, but wrong role
  });

  // TEST: a change with no security token is refused.
  test('a change without the CSRF token is rejected', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    session.csrfToken = undefined; // pretend the token is missing
    const res = await send(session, 'post', '/user-accounts', newAccount()); // try to create an account
    expect(res.status).toBe(403); // the check must refuse it
  });
}); // End of Access control.

// =============================================================================
// TEST GROUP: #6 Profile choices
// Story #6 (part): the Create and Update forms need a list of profiles to pick from.
// =============================================================================
describe('#6 Profile choices for the account form', () => {
  // TEST: the dropdown list has active profiles only, sorted A-Z.
  test('lists active profiles by name, without suspended ones', async () => {
    await UserProfile.create({ name: 'Old Role', status: 'suspended' }); // add a suspended role
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'get', '/user-accounts/profiles'); // ask for the list
    expect(res.status).toBe(200); // the request must work
    // Only id and name are sent, sorted A-Z. 'Old Role' is suspended, so it is left out.
    expect(res.body).toEqual([
      { id: customerProfile.id, name: 'Customer' }, // first in A-Z order
      { id: designerProfile.id, name: 'Interior Designer' }, // second
      { id: adminProfile.id, name: 'User Admin' }, // third
    ]);
  });

  // TEST: a Customer cannot get this list.
  test('is only for a User Admin', async () => {
    const session = await startSession('customer1'); // log in as the Customer
    await send(session, 'get', '/user-accounts/profiles').expect(403); // it must be refused
  });
}); // End of #6 Profile choices.

// =============================================================================
// TEST GROUP: #6 Create user account
// =============================================================================
describe('#6 Create user account', () => {
  // TEST: the basic flow. The account is created and no password comes back.
  test('creates the account and never returns the password', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'post', '/user-accounts', newAccount()); // create the account
    expect(res.status).toBe(201); // 201 Created
    // toMatchObject: the reply must contain at least these fields and values.
    expect(res.body).toMatchObject({
      username: 'new.user', // the user ID that was sent
      name: 'New User', // the name that was sent
      email: 'new.user@example.com', // the email that was sent
      status: 'active', // new accounts start active
      profileId: customerProfile.id, // the role that was sent
      profileName: 'Customer', // the name of that role
    });
    expect(res.body.password).toBeUndefined(); // the password must never be sent back
  });

  // TEST: the password is saved scrambled, and it still works for login.
  test('stores the password as a bcrypt hash, so the new user can log in', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'post', '/user-accounts', newAccount()).expect(201); // create the account
    // Read the row straight from the database to check what was stored.
    const saved = await UserAccount.findOne({ where: { username: 'new.user' } });
    expect(saved.password).not.toBe(NEW_PASSWORD); // not stored as plain text
    // The real proof: the new user can log in with the password the admin set.
    const login = await startSession('new.user', NEW_PASSWORD);
    expect(login.response.status).toBe(200); // the login must work
  });

  // TEST: an alternative flow. The user ID is taken.
  test('rejects a user ID that is already in use', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'post', '/user-accounts', newAccount({ username: 'customer1' })); // use a taken user ID
    expect(res.status).toBe(409); // 409 Conflict
    expect(res.body.errors.username).toBe('This user ID is already in use.'); // the message for that box
  });

  // TEST: an alternative flow. The email is taken.
  test('rejects an email that is already in use', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'post', '/user-accounts', newAccount({ email: 'customer1@example.com' })); // use a taken email
    expect(res.status).toBe(409); // 409 Conflict
    expect(res.body.errors.email).toBe('This email is already in use.'); // the message for that box
  });

  // TEST: an alternative flow. Every field is wrong.
  test('rejects missing and invalid fields', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    // Every field is wrong: too short, too short, empty, not an email, no such profile.
    const res = await send(session, 'post', '/user-accounts', {
      username: 'x', password: 'short', name: '', email: 'not-an-email', profileId: 9999,
    });
    expect(res.status).toBe(400); // 400 Bad Request
    // All 5 problems are reported at once. .sort() puts the names in A-Z
    // order so the comparison does not depend on the order they were found.
    expect(Object.keys(res.body.errors).sort()).toEqual(['email', 'name', 'password', 'profileId', 'username']);
  });

  // TEST: an alternative flow. The date of birth does not exist on a calendar.
  test('rejects a date of birth that is not a real date', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    // Month 13 and 31 February do not exist. Both must give a clear 400
    // error, not crash the server with a 500.
    for (const dob of ['2000-13-01', '2000-02-31']) {
      const res = await send(session, 'post', '/user-accounts', newAccount({ dob })); // try this date
      expect(res.status).toBe(400); // it must be refused
      expect(res.body.errors.dob).toBe('Enter a valid date of birth.'); // with this message
    }
  });
}); // End of #6 Create.

// =============================================================================
// TEST GROUP: #7 View user account
// =============================================================================
describe('#7 View user account', () => {
  // TEST: the basic flow. One account comes back with its role.
  test('shows one account with its profile', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    // `...${customer.id}` puts the customer's real ID into the address.
    const res = await send(session, 'get', `/user-accounts/${customer.id}`);
    expect(res.status).toBe(200); // the request must work
    expect(res.body).toMatchObject({ id: customer.id, username: 'customer1', profileName: 'Customer' }); // the right account
    expect(res.body.password).toBeUndefined(); // no password in the reply
  });

  // TEST: an alternative flow. No account has this ID.
  test('returns 404 for an account that does not exist', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'get', '/user-accounts/9999').expect(404); // ID 9999 does not exist
  });
}); // End of #7 View.

// =============================================================================
// TEST GROUP: #8 Update user account
// =============================================================================
describe('#8 Update user account', () => {
  // TEST: the basic flow. The details and the role change.
  test('updates the details and profile', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, {
      name: 'Renamed Customer', // a new name
      email: 'renamed@example.com', // a new email
      profileId: designerProfile.id, // change the role to Interior Designer
    });
    expect(res.status).toBe(200); // the request must work
    expect(res.body).toMatchObject({ name: 'Renamed Customer', email: 'renamed@example.com', profileName: 'Interior Designer' }); // the new values
  });

  // TEST: changing the password works.
  test('a new password is hashed and works for login', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'put', `/user-accounts/${customer.id}`, { password: NEW_PASSWORD }).expect(200); // change the password
    // The new password works and the old one does not.
    expect((await startSession('customer1', NEW_PASSWORD)).response.status).toBe(200);
    expect((await startSession('customer1', PASSWORD)).response.status).toBe(401);
  });

  // TEST: an update that does not mention the password keeps it.
  test('leaving the password out keeps the old one', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'put', `/user-accounts/${customer.id}`, { name: 'Same Password' }).expect(200); // change only the name
    expect((await startSession('customer1', PASSWORD)).response.status).toBe(200); // the old password still works
  });

  // TEST: an alternative flow. The new user ID belongs to someone else.
  test('rejects a user ID that another account uses', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, { username: 'admin1' }); // use a taken user ID
    expect(res.status).toBe(409); // 409 Conflict
  });

  // TEST: an alternative flow. No account has this ID.
  test('returns 404 for an account that does not exist', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'put', '/user-accounts/9999', { name: 'Nobody' }).expect(404); // ID 9999 does not exist
  });

  // Alternative flow of #8: reactivating a suspended account is an update
  // that sets the status back to 'active'.
  test('reactivates a suspended account, so the user can log in again', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'post', `/user-accounts/${customer.id}/suspend`).expect(200); // suspend the account first
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, { status: 'active' }); // reactivate it
    expect(res.status).toBe(200); // the request must work
    expect(res.body.status).toBe('active'); // the status is active again
    // The proof that matters: the user can log in again.
    expect((await startSession('customer1')).response.status).toBe(200);
  });

  // TEST: Update must refuse the status 'suspended'.
  test('update cannot suspend; only Suspend (#9) can', async () => {
    // If Update accepted 'suspended', it would skip #9's rule that an admin
    // cannot suspend their own account. So only 'active' is accepted.
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'put', `/user-accounts/${admin.id}`, { status: 'suspended' }); // try it
    expect(res.status).toBe(400); // it must be refused
    expect(res.body.errors.status).toBe('Use Suspend to suspend an account.'); // with this message
  });

  // TEST: a normal update does not reactivate a suspended account by accident.
  test('an update without a status keeps a suspended account suspended', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'post', `/user-accounts/${customer.id}/suspend`).expect(200); // suspend the account first
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, { name: 'Still Suspended' }); // change only the name
    expect(res.status).toBe(200); // the request must work
    expect(res.body.status).toBe('suspended'); // it stays suspended
  });
}); // End of #8 Update.

// =============================================================================
// TEST GROUP: #9 Suspend user account
// =============================================================================
describe('#9 Suspend user account', () => {
  // TEST: the basic flow. The status becomes suspended.
  test('suspends the account', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'post', `/user-accounts/${customer.id}/suspend`); // suspend the Customer
    expect(res.status).toBe(200); // the request must work
    expect(res.body.status).toBe('suspended'); // the status changed
  });

  // TEST: a suspended person cannot log in.
  test('a suspended user can no longer log in', async () => {
    // This is the "so that" part of the story: "so that those users can no
    // longer log in". It proves the feature does what the story promises.
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'post', `/user-accounts/${customer.id}/suspend`).expect(200); // suspend the Customer
    const login = await startSession('customer1'); // the Customer tries to log in
    expect(login.response.status).toBe(403); // the login must be refused
    expect(login.response.body.message).toBe('This account is suspended.'); // with this message
  });

  // TEST: an alternative flow. Admins cannot suspend themselves.
  test('a User Admin cannot suspend their own account', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'post', `/user-accounts/${admin.id}/suspend`); // try to suspend themselves
    expect(res.status).toBe(409); // it must be refused
    expect(res.body.message).toBe('You cannot suspend your own account.'); // with this message
  });

  // TEST: an alternative flow. No account has this ID.
  test('returns 404 for an account that does not exist', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    await send(session, 'post', '/user-accounts/9999/suspend').expect(404); // ID 9999 does not exist
  });
}); // End of #9 Suspend.

// =============================================================================
// TEST GROUP: #10 Search user accounts
// =============================================================================
describe('#10 Search user accounts', () => {
  // TEST: an empty search lists everyone.
  test('with no keyword, lists every account without passwords', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'get', '/user-accounts'); // search with no keyword
    expect(res.status).toBe(200); // the request must work
    // .map((a) => a.username) turns the list of accounts into a list of user IDs.
    expect(res.body.map((a) => a.username).sort()).toEqual(['admin1', 'customer1']);
    // .every(...) is true only if the check is true for every account.
    expect(res.body.every((a) => a.password === undefined)).toBe(true);
  });

  // TEST: the search looks in 3 fields and ignores capitals.
  test('matches user ID, name or email, ignoring capitals', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    // One search per field: user ID in capitals, part of a name, part of an email.
    expect((await send(session, 'get', '/user-accounts?keyword=CUSTOMER1')).body.map((a) => a.username)).toEqual(['customer1']);
    expect((await send(session, 'get', '/user-accounts?keyword=demo admin')).body.map((a) => a.username)).toEqual(['admin1']);
    expect((await send(session, 'get', '/user-accounts?keyword=customer1@example')).body.map((a) => a.username)).toEqual(['customer1']);
  });

  // TEST: a search with no matches gives an empty list, not an error.
  test('returns an empty list when nothing matches', async () => {
    const session = await startSession('admin1'); // log in as the User Admin
    const res = await send(session, 'get', '/user-accounts?keyword=zzz'); // search for something absent
    expect(res.status).toBe(200); // the request must still work
    expect(res.body).toEqual([]); // toEqual compares the contents, [] = empty list
  });
}); // End of #10 Search.
