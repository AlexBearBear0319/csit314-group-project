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
let adminProfile;
let customerProfile;
let designerProfile;
let admin;
let customer;

// -----------------------------------------------------------------------------
// Helper: log in and keep the session, like a browser would.
// request.agent(app) is a fake browser that remembers cookies between requests.
// The login reply includes a CSRF token, which every change request must send.
// Returns { client, csrfToken, response } so tests can use all three.
// -----------------------------------------------------------------------------
async function startSession(username, password = PASSWORD) {
  const client = request.agent(app);
  const response = await client.post('/api/login').set('Origin', ORIGIN).send({ username, password });
  return { client, csrfToken: response.body.csrfToken, response };
}

// -----------------------------------------------------------------------------
// Helper: send a request as the logged-in user.
//   session - from startSession
//   method  - 'get', 'post' or 'put'
//   path    - e.g. '/user-accounts/5'  (/api is added here)
//   body    - optional JSON to send
// session.client[method] picks the right function: client.get, client.post ...
// -----------------------------------------------------------------------------
function send(session, method, path, body) {
  let req = session.client[method](`/api${path}`).set('Origin', ORIGIN);
  if (session.csrfToken) req = req.set('X-CSRF-Token', session.csrfToken);
  if (body !== undefined) req = req.send(body);
  return req;
}

// -----------------------------------------------------------------------------
// Helper: the fields of a valid new account. Tests can change any field:
//   newAccount({ username: 'customer1' })  -> same as below, but that user ID.
// { ...defaults, ...values } copies the defaults, then overwrites with values.
// -----------------------------------------------------------------------------
function newAccount(values = {}) {
  return {
    username: 'new.user',
    password: NEW_PASSWORD,
    name: 'New User',
    email: 'new.user@example.com',
    profileId: customerProfile.id,
    ...values,
  };
}

// -----------------------------------------------------------------------------
// beforeEach runs before EVERY test, so every test starts from the same data
// and one test can never break another.
// -----------------------------------------------------------------------------
beforeEach(async () => {
  resetRateLimitsForTests(); // Alex's code blocks too many logins; reset the counter
  await sequelize.sync({ force: true }); // wipe and recreate all tables (memory database only)

  // Create 3 profiles (roles). Promise.all runs the 3 creates together and
  // waits for all of them. [a, b, c] = ... takes the 3 results in order.
  [adminProfile, customerProfile, designerProfile] = await Promise.all([
    UserProfile.create({ name: 'User Admin' }),
    UserProfile.create({ name: 'Customer' }),
    UserProfile.create({ name: 'Interior Designer' }),
  ]);

  // Hash the password once. Cost 4 instead of 10 keeps the tests fast.
  const hash = await bcrypt.hash(PASSWORD, 4);

  // Create 2 starting accounts: one User Admin and one Customer.
  [admin, customer] = await Promise.all([
    UserAccount.create({ username: 'admin1', password: hash, name: 'Demo Admin', email: 'admin1@example.com', profileId: adminProfile.id }),
    UserAccount.create({ username: 'customer1', password: hash, name: 'Demo Customer', email: 'customer1@example.com', profileId: customerProfile.id }),
  ]);
});

// afterAll runs once at the very end: close the database so Jest can exit.
afterAll(async () => {
  await sequelize.close();
});

// =============================================================================
// describe(...) groups related tests under one heading in the test output.
// =============================================================================

// Only a logged-in User Admin may use these features (the 3 checks in index.cjs).
describe('Access control', () => {
  test('a visitor who is not logged in is rejected', async () => {
    // No startSession: no cookie. .expect(401) checks the status code.
    await request(app).get('/api/user-accounts').expect(401);
  });

  test('a logged-in user who is not a User Admin is rejected', async () => {
    const session = await startSession('customer1');
    const res = await send(session, 'get', '/user-accounts');
    expect(res.status).toBe(403); // 403 Forbidden: logged in, but wrong role
  });

  test('a change without the CSRF token is rejected', async () => {
    const session = await startSession('admin1');
    session.csrfToken = undefined; // pretend the token is missing
    const res = await send(session, 'post', '/user-accounts', newAccount());
    expect(res.status).toBe(403);
  });
});

// Story #6 (part): the Create and Update forms need a list of profiles to pick from.
describe('#6 Profile choices for the account form', () => {
  test('lists active profiles by name, without suspended ones', async () => {
    await UserProfile.create({ name: 'Old Role', status: 'suspended' });
    const session = await startSession('admin1');
    const res = await send(session, 'get', '/user-accounts/profiles');
    expect(res.status).toBe(200);
    // Only id and name are sent, sorted A-Z. 'Old Role' is suspended, so it is left out.
    expect(res.body).toEqual([
      { id: customerProfile.id, name: 'Customer' },
      { id: designerProfile.id, name: 'Interior Designer' },
      { id: adminProfile.id, name: 'User Admin' },
    ]);
  });

  test('is only for a User Admin', async () => {
    const session = await startSession('customer1');
    await send(session, 'get', '/user-accounts/profiles').expect(403);
  });
});

// Story #6: Create user account
describe('#6 Create user account', () => {
  test('creates the account and never returns the password', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'post', '/user-accounts', newAccount());
    expect(res.status).toBe(201); // 201 Created
    // toMatchObject: the reply must contain at least these fields and values.
    expect(res.body).toMatchObject({
      username: 'new.user',
      name: 'New User',
      email: 'new.user@example.com',
      status: 'active', // new accounts start active
      profileId: customerProfile.id,
      profileName: 'Customer',
    });
    expect(res.body.password).toBeUndefined(); // the password must never be sent back
  });

  test('stores the password as a bcrypt hash, so the new user can log in', async () => {
    const session = await startSession('admin1');
    await send(session, 'post', '/user-accounts', newAccount()).expect(201);
    // Read the row straight from the database to check what was stored.
    const saved = await UserAccount.findOne({ where: { username: 'new.user' } });
    expect(saved.password).not.toBe(NEW_PASSWORD); // not stored as plain text
    // The real proof: the new user can log in with the password the admin set.
    const login = await startSession('new.user', NEW_PASSWORD);
    expect(login.response.status).toBe(200);
  });

  test('rejects a user ID that is already in use', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'post', '/user-accounts', newAccount({ username: 'customer1' }));
    expect(res.status).toBe(409); // 409 Conflict
    expect(res.body.errors.username).toBe('This user ID is already in use.');
  });

  test('rejects an email that is already in use', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'post', '/user-accounts', newAccount({ email: 'customer1@example.com' }));
    expect(res.status).toBe(409);
    expect(res.body.errors.email).toBe('This email is already in use.');
  });

  test('rejects missing and invalid fields', async () => {
    const session = await startSession('admin1');
    // Every field is wrong: too short, too short, empty, not an email, no such profile.
    const res = await send(session, 'post', '/user-accounts', {
      username: 'x', password: 'short', name: '', email: 'not-an-email', profileId: 9999,
    });
    expect(res.status).toBe(400); // 400 Bad Request
    // All 5 problems are reported at once. .sort() puts the names in A-Z
    // order so the comparison does not depend on the order they were found.
    expect(Object.keys(res.body.errors).sort()).toEqual(['email', 'name', 'password', 'profileId', 'username']);
  });

  test('rejects a date of birth that is not a real date', async () => {
    const session = await startSession('admin1');
    // Month 13 and 31 February do not exist. Both must give a clear 400
    // error, not crash the server with a 500.
    for (const dob of ['2000-13-01', '2000-02-31']) {
      const res = await send(session, 'post', '/user-accounts', newAccount({ dob }));
      expect(res.status).toBe(400);
      expect(res.body.errors.dob).toBe('Enter a valid date of birth.');
    }
  });
});

// Story #7: View user account
describe('#7 View user account', () => {
  test('shows one account with its profile', async () => {
    const session = await startSession('admin1');
    // `...${customer.id}` puts the customer's real ID into the address.
    const res = await send(session, 'get', `/user-accounts/${customer.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: customer.id, username: 'customer1', profileName: 'Customer' });
    expect(res.body.password).toBeUndefined();
  });

  test('returns 404 for an account that does not exist', async () => {
    const session = await startSession('admin1');
    await send(session, 'get', '/user-accounts/9999').expect(404);
  });
});

// Story #8: Update user account
describe('#8 Update user account', () => {
  test('updates the details and profile', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, {
      name: 'Renamed Customer',
      email: 'renamed@example.com',
      profileId: designerProfile.id, // change the role to Interior Designer
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Renamed Customer', email: 'renamed@example.com', profileName: 'Interior Designer' });
  });

  test('a new password is hashed and works for login', async () => {
    const session = await startSession('admin1');
    await send(session, 'put', `/user-accounts/${customer.id}`, { password: NEW_PASSWORD }).expect(200);
    // The new password works and the old one does not.
    expect((await startSession('customer1', NEW_PASSWORD)).response.status).toBe(200);
    expect((await startSession('customer1', PASSWORD)).response.status).toBe(401);
  });

  test('leaving the password out keeps the old one', async () => {
    const session = await startSession('admin1');
    await send(session, 'put', `/user-accounts/${customer.id}`, { name: 'Same Password' }).expect(200);
    expect((await startSession('customer1', PASSWORD)).response.status).toBe(200);
  });

  test('rejects a user ID that another account uses', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, { username: 'admin1' });
    expect(res.status).toBe(409);
  });

  test('returns 404 for an account that does not exist', async () => {
    const session = await startSession('admin1');
    await send(session, 'put', '/user-accounts/9999', { name: 'Nobody' }).expect(404);
  });

  // Alternative flow of #8: reactivating a suspended account is an update
  // that sets the status back to 'active'.
  test('reactivates a suspended account, so the user can log in again', async () => {
    const session = await startSession('admin1');
    await send(session, 'post', `/user-accounts/${customer.id}/suspend`).expect(200);
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, { status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    // The proof that matters: the user can log in again.
    expect((await startSession('customer1')).response.status).toBe(200);
  });

  test('update cannot suspend; only Suspend (#9) can', async () => {
    // If Update accepted 'suspended', it would skip #9's rule that an admin
    // cannot suspend their own account. So only 'active' is accepted.
    const session = await startSession('admin1');
    const res = await send(session, 'put', `/user-accounts/${admin.id}`, { status: 'suspended' });
    expect(res.status).toBe(400);
    expect(res.body.errors.status).toBe('Use Suspend to suspend an account.');
  });

  test('an update without a status keeps a suspended account suspended', async () => {
    const session = await startSession('admin1');
    await send(session, 'post', `/user-accounts/${customer.id}/suspend`).expect(200);
    const res = await send(session, 'put', `/user-accounts/${customer.id}`, { name: 'Still Suspended' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('suspended');
  });
});

// Story #9: Suspend user account
describe('#9 Suspend user account', () => {
  test('suspends the account', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'post', `/user-accounts/${customer.id}/suspend`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('suspended');
  });

  test('a suspended user can no longer log in', async () => {
    // This is the "so that" part of the story: "so that those users can no
    // longer log in". It proves the feature does what the story promises.
    const session = await startSession('admin1');
    await send(session, 'post', `/user-accounts/${customer.id}/suspend`).expect(200);
    const login = await startSession('customer1');
    expect(login.response.status).toBe(403);
    expect(login.response.body.message).toBe('This account is suspended.');
  });

  test('a User Admin cannot suspend their own account', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'post', `/user-accounts/${admin.id}/suspend`);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('You cannot suspend your own account.');
  });

  test('returns 404 for an account that does not exist', async () => {
    const session = await startSession('admin1');
    await send(session, 'post', '/user-accounts/9999/suspend').expect(404);
  });
});

// Story #10: Search user accounts
describe('#10 Search user accounts', () => {
  test('with no keyword, lists every account without passwords', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'get', '/user-accounts');
    expect(res.status).toBe(200);
    // .map((a) => a.username) turns the list of accounts into a list of user IDs.
    expect(res.body.map((a) => a.username).sort()).toEqual(['admin1', 'customer1']);
    // .every(...) is true only if the check is true for every account.
    expect(res.body.every((a) => a.password === undefined)).toBe(true);
  });

  test('matches user ID, name or email, ignoring capitals', async () => {
    const session = await startSession('admin1');
    // One search per field: user ID in capitals, part of a name, part of an email.
    expect((await send(session, 'get', '/user-accounts?keyword=CUSTOMER1')).body.map((a) => a.username)).toEqual(['customer1']);
    expect((await send(session, 'get', '/user-accounts?keyword=demo admin')).body.map((a) => a.username)).toEqual(['admin1']);
    expect((await send(session, 'get', '/user-accounts?keyword=customer1@example')).body.map((a) => a.username)).toEqual(['customer1']);
  });

  test('returns an empty list when nothing matches', async () => {
    const session = await startSession('admin1');
    const res = await send(session, 'get', '/user-accounts?keyword=zzz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // toEqual compares the contents, [] = empty list
  });
});
