// =============================================================================
// TESTS: shortlist.test.js
// Unit tests for Customer shortlist stories #34-36.
// These were written BEFORE the code (TDD): they failed first (red), then the
// code was written until they passed (green).
//
// HOW TO RUN (from the server folder):
//   npx jest tests/shortlist.test.js     <- only these tests
//   npm test                             <- every test in the project
//
// These tests use the temporary in-memory database, so the real Supabase
// database is never touched. (How the tests work is explained at the top of
// userAccounts.test.js.)
//
// STATUS CODES THE TESTS CHECK:
//   200 OK, 201 Created, 400 Bad Request (wrong input), 401 Not logged in,
//   403 Not allowed, 404 Not Found, 409 Conflict (already saved)
// =============================================================================

const request = require('supertest'); // to send fake requests
const app = require('../src/app'); // the backend itself
const { sequelize, UserAccount, UserProfile, InteriorDesignProject, ProjectImage } = require('../src/entity'); // database classes
const { featureSession, ORIGIN } = require('./helpers/featureSession'); // logs in a test user

// "let" variables that every test can use. beforeEach fills them in.
let customer; // a logged-in Customer
let designer; // the account that owns the test projects
let kitchen; // a test project
let bedroom; // a second test project

// =============================================================================
// FUNCTION: createProject (helper)
// WHAT IT DOES: saves one test project in the database.
// RECEIVES: name = the project name; values = any other fields to set.
// GIVES BACK: the new project.
// =============================================================================
function createProject(name, values = {}) {
  return InteriorDesignProject.create({
    name, // the project name
    status: 'current', // a project in progress
    designerAccountId: designer.id, // the designer who owns it
    ...values, // any field the test wants to change replaces the ones above
  });
} // End of createProject.

// =============================================================================
// SETUP: beforeEach runs before EVERY test, so every test starts from the same data.
// =============================================================================
beforeEach(async () => {
  await sequelize.sync({ force: true }); // wipe and recreate all tables (memory database only)
  customer = await featureSession('Customer', 'customer.one'); // log in a Customer
  // Create the designer account. Its role is linked to a new profile.
  const profile = await UserProfile.create({ name: 'Interior Designer' });
  designer = await UserAccount.create({ username: 'designer.one', password: 'not-used', name: 'Dana Designer', email: 'dana@example.com', profileId: profile.id });
  // Create 2 projects for the tests to save.
  kitchen = await createProject('Warm Kitchen', { propertyType: 'Condo', designStyle: 'Modern' });
  bedroom = await createProject('Quiet Bedroom', { propertyType: 'HDB', designStyle: 'Japandi' });
}); // End of the setup.

// =============================================================================
// CLEAN-UP: afterAll runs once at the very end: close the database so Jest can exit.
// =============================================================================
afterAll(async () => {
  await sequelize.close();
});

// =============================================================================
// TEST GROUP: Access control
// Only a logged-in Customer may use the shortlist.
// =============================================================================
describe('Access control', () => {
  // TEST: someone who has not logged in is refused.
  test('a visitor who is not logged in is rejected', async () => {
    await request(app).get('/api/customer/shortlist').expect(401); // no cookie, so 401
  });

  // TEST: a logged-in user with another role is refused.
  test('a logged-in user who is not a Customer is rejected', async () => {
    const admin = await featureSession('User Admin', 'admin.one'); // log in a User Admin
    await admin.client.get('/api/customer/shortlist').expect(403); // wrong role, so 403
  });

  // TEST: a save with no security token is refused.
  test('a save without the CSRF token is rejected', async () => {
    // customer.agent sends the cookie but not the X-CSRF-Token header.
    await customer.agent.post('/api/customer/shortlist').set('Origin', ORIGIN).send({ projectId: kitchen.id }).expect(403);
  });
}); // End of Access control.

// =============================================================================
// TEST GROUP: #34 Save IDP to shortlist
// =============================================================================
describe('#34 Save IDP to shortlist', () => {
  // TEST: the basic flow. The project is saved.
  test('saves a project to the shortlist', async () => {
    const res = await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }); // save it
    expect(res.status).toBe(201); // 201 Created
    expect(res.body).toMatchObject({ id: kitchen.id, name: 'Warm Kitchen' }); // the saved project comes back
  });

  // TEST: a past project can also be saved.
  test('saves a past project too', async () => {
    const past = await createProject('Old Loft', { status: 'past', completionDate: '2025-01-15' }); // a finished project
    const res = await customer.client.post('/api/customer/shortlist').send({ projectId: past.id }); // save it
    expect(res.status).toBe(201); // 201 Created
  });

  // TEST: the owner comes from the login, never from what the browser sends.
  test('ignores an owner sent by the browser', async () => {
    const other = await featureSession('Customer', 'customer.two'); // log in a second Customer
    // Customer one tries to save into the shortlist of customer two.
    await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id, customerAccountId: other.account.id }).expect(201);
    const res = await other.client.get('/api/customer/shortlist'); // read customer two's shortlist
    expect(res.body).toEqual([]); // it must still be empty
  });

  // TEST: an alternative flow. The project is already saved.
  test('rejects a project that is already saved', async () => {
    await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }).expect(201); // the first save
    const res = await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }); // the second save
    expect(res.status).toBe(409); // 409 Conflict
    expect(res.body.message).toBe('This project is already in your shortlist.'); // with this message
  });

  // TEST: an alternative flow. No project has this ID.
  test('returns 404 for a project that does not exist', async () => {
    await customer.client.post('/api/customer/shortlist').send({ projectId: 9999 }).expect(404); // ID 9999 does not exist
  });

  // TEST: an alternative flow. The project ID is wrong or missing.
  test.each([{}, { projectId: 'abc' }, { projectId: 0 }, { projectId: 1.5 }, { projectId: 2147483648 }])('rejects the invalid input %j', async (body) => {
    const res = await customer.client.post('/api/customer/shortlist').send(body); // try this input
    expect(res.status).toBe(400); // 400 Bad Request
    expect(res.body.errors.projectId).toBe('Choose a project to save.'); // with this message
  });
}); // End of #34 Save.

// =============================================================================
// TEST GROUP: #35 Search shortlisted IDPs
// =============================================================================
describe('#35 Search shortlisted IDPs', () => {
  // SETUP FOR THIS GROUP: save both projects to the shortlist before each test.
  beforeEach(async () => {
    await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }).expect(201); // save the kitchen
    await customer.client.post('/api/customer/shortlist').send({ projectId: bedroom.id }).expect(201); // save the bedroom
  });

  // TEST: an empty search lists everything saved.
  test('with no keyword, lists every saved project', async () => {
    const res = await customer.client.get('/api/customer/shortlist'); // search with no keyword
    expect(res.status).toBe(200); // the request must work
    expect(res.body.map((item) => item.name).sort()).toEqual(['Quiet Bedroom', 'Warm Kitchen']); // both projects
  });

  // TEST: the search looks in 3 fields and ignores capitals.
  test('matches name, property type or design style, ignoring capitals', async () => {
    // One search per field. .map keeps only the project names to compare.
    expect((await customer.client.get('/api/customer/shortlist?keyword=KITCHEN')).body.map((item) => item.name)).toEqual(['Warm Kitchen']);
    expect((await customer.client.get('/api/customer/shortlist?keyword=hdb')).body.map((item) => item.name)).toEqual(['Quiet Bedroom']);
    expect((await customer.client.get('/api/customer/shortlist?keyword=modern')).body.map((item) => item.name)).toEqual(['Warm Kitchen']);
  });

  // TEST: special search characters count as normal text.
  test('treats % as plain text, not as a wildcard', async () => {
    const res = await customer.client.get('/api/customer/shortlist?keyword=%25'); // %25 is how % is written in a web address
    expect(res.body).toEqual([]); // no project name contains %
  });

  // TEST: a project that was not saved never appears.
  test('leaves out projects that were not saved', async () => {
    await createProject('Unsaved Studio'); // a project nobody saved
    const res = await customer.client.get('/api/customer/shortlist?keyword=studio'); // search for it
    expect(res.body).toEqual([]); // it must not appear
  });

  // TEST: one Customer cannot see another Customer's shortlist.
  test('shows each Customer only their own shortlist', async () => {
    const other = await featureSession('Customer', 'customer.two'); // log in a second Customer
    const res = await other.client.get('/api/customer/shortlist'); // read their shortlist
    expect(res.status).toBe(200); // the request must work
    expect(res.body).toEqual([]); // it must be empty
  });

  // TEST: a repeated keyword in the address does not crash the server.
  test('treats a repeated keyword as no keyword', async () => {
    const res = await customer.client.get('/api/customer/shortlist?keyword=a&keyword=b'); // Express turns this into a list
    expect(res.status).toBe(200); // the request must still work
    expect(res.body).toHaveLength(2); // every saved project is listed
  });

  // TEST: a search with no matches gives an empty list, not an error.
  test('returns an empty list when nothing matches', async () => {
    const res = await customer.client.get('/api/customer/shortlist?keyword=zzz'); // search for something absent
    expect(res.status).toBe(200); // the request must still work
    expect(res.body).toEqual([]); // an empty list
  });
}); // End of #35 Search.

// =============================================================================
// TEST GROUP: #36 View shortlisted IDP
// =============================================================================
describe('#36 View shortlisted IDP', () => {
  // TEST: the basic flow. The full details come back.
  test('shows a saved project with its details and photo records', async () => {
    // Add one photo record to the project.
    await ProjectImage.create({ projectId: kitchen.id, storagePath: 'test/photo.jpg', fileName: 'photo.jpg', contentType: 'image/jpeg', sizeBytes: 100, altText: 'A kitchen', sortOrder: 0 });
    await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }).expect(201); // save the project
    const res = await customer.client.get(`/api/customer/shortlist/${kitchen.id}`); // view it
    expect(res.status).toBe(200); // the request must work
    expect(res.body).toMatchObject({ id: kitchen.id, name: 'Warm Kitchen', propertyType: 'Condo', designStyle: 'Modern', designerName: 'Dana Designer', imageCount: 1 }); // the details
    expect(res.body.images[0]).toMatchObject({ fileName: 'photo.jpg', altText: 'A kitchen' }); // the photo record
    expect(res.body.images[0].storagePath).toBeUndefined(); // the private storage path is not sent
  });

  // TEST: the designer's private details are not sent to the Customer.
  test('does not send the designer account details', async () => {
    await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }).expect(201); // save the project
    const res = await customer.client.get(`/api/customer/shortlist/${kitchen.id}`); // view it
    expect(JSON.stringify(res.body)).not.toContain('dana@example.com'); // no email anywhere in the reply
    expect(res.body.designerAccountId).toBeUndefined(); // no account ID
  });

  // TEST: an alternative flow. The project exists, but this Customer did not save it.
  test('returns 404 for a project that is not in this shortlist', async () => {
    await customer.client.get(`/api/customer/shortlist/${kitchen.id}`).expect(404); // not saved yet
  });

  // TEST: an alternative flow. Another Customer's saved project stays hidden.
  test('returns 404 for a project only another Customer saved', async () => {
    const other = await featureSession('Customer', 'customer.two'); // log in a second Customer
    await other.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }).expect(201); // they save it
    await customer.client.get(`/api/customer/shortlist/${kitchen.id}`).expect(404); // the first Customer cannot view it
  });

  // TEST: an alternative flow. The ID in the address cannot be real.
  test('returns 404 for an ID that is not a real ID', async () => {
    await customer.client.get('/api/customer/shortlist/not-an-id').expect(404); // not a number
  });

  // TEST: when a designer deletes a project, it leaves the shortlist too.
  test('removes a saved project when the designer deletes it', async () => {
    await customer.client.post('/api/customer/shortlist').send({ projectId: kitchen.id }).expect(201); // save the project
    await kitchen.destroy(); // the project is deleted
    const res = await customer.client.get('/api/customer/shortlist'); // read the shortlist
    expect(res.body).toEqual([]); // it is gone
  });
}); // End of #36 View.
