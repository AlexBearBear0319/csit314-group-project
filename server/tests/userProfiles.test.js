// BCE: Outside BCE (test or test support).
// Tests profile management and how profile status affects account access.

// =============================================================================
// TESTS: user profiles (stories #1-5)
// Create, view, update, suspend, activate and search, duplicate names and bad input.
// =============================================================================

const { featureSession } = require('./helpers/featureSession');
let client;
const bcrypt = require('bcryptjs');
const { sequelize, UserProfile, UserAccount } = require('../src/entity');
const UserLoginC = require('../src/controller/UserLoginC');

// Login now lives in UserLoginC (controller). It returns the account when the
// login is fine, and throws a RequestError with a status and message otherwise.
const userLogin = new UserLoginC();

beforeEach(async () => {
  await sequelize.sync({ force: true });
  ({ client } = await featureSession('User Admin'));
});
afterAll(async () => { await sequelize.close(); });

describe('User profile stories #1–5', () => {
  // Check this scenario: creates an active profile and trims its fields.
  test('creates an active profile and trims its fields', async () => {
    const res = await client.post('/api/user-profiles')
      .send({ name: ' Customer ', description: ' Home owners ', status: 'suspended' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Customer', description: 'Home owners', status: 'active' });
    expect(await UserProfile.count()).toBe(2);
  });

  test.each([{}, { name: '' }, { name: '   ' }, { name: 4 },
    { name: 'x'.repeat(256) }, { name: 'Customer', description: [] }])
  ('rejects invalid create input %j', async (body) => {
    const res = await client.post('/api/user-profiles').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
    expect(await UserProfile.count()).toBe(1);
  });

  // Check this scenario: rejects a duplicate profile name.
  test('rejects a duplicate profile name', async () => {
    await UserProfile.create({ name: 'Customer' });
    const res = await client.post('/api/user-profiles').send({ name: 'Customer' });
    expect(res.status).toBe(409);
  });

  // Check this scenario: views one profile and returns 404 for a missing profile.
  test('views one profile and returns 404 for a missing profile', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    const res = await client.get(`/api/user-profiles/${profile.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Customer');
    expect((await client.get('/api/user-profiles/9999')).status).toBe(404);
    expect((await client.get('/api/user-profiles/not-an-id')).status).toBe(400);
    expect((await client.get('/api/user-profiles/2147483648')).status).toBe(400);
  });

  // Check this scenario: updates only editable fields without changing account links or status.
  test('updates only editable fields without changing account links or status', async () => {
    const profile = await UserProfile.create({ name: 'Customer', status: 'suspended' });
    const account = await UserAccount.create({ username: 'a', password: 'hash', name: 'A',
      email: 'a@example.com', profileId: profile.id });
    const res = await client.put(`/api/user-profiles/${profile.id}`)
      .send({ name: 'Homeowner', description: 'Updated', status: 'active', id: 999 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: profile.id, name: 'Homeowner', status: 'suspended' });
    await account.reload();
    expect(account.profileId).toBe(profile.id);
  });

  // Check this scenario: invalid and duplicate updates leave the profile unchanged.
  test('invalid and duplicate updates leave the profile unchanged', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    await UserProfile.create({ name: 'Designer' });
    expect((await client.put(`/api/user-profiles/${profile.id}`).send({ name: ' ' })).status).toBe(400);
    expect((await client.put(`/api/user-profiles/${profile.id}`).send({ name: 'Designer' })).status).toBe(409);
    await profile.reload();
    expect(profile.name).toBe('Customer');
    expect((await client.put('/api/user-profiles/9999').send({ name: 'Valid' })).status).toBe(404);
  });

  // Check this scenario: suspension keeps the profile and accounts, and blocks their login.
  test('suspension keeps the profile and accounts, and blocks their login', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    await UserAccount.create({ username: 'customer', password: await bcrypt.hash('password123', 4),
      name: 'Customer', email: 'c@example.com', profileId: profile.id });
    expect((await userLogin.login('customer', 'password123')).account).toBeTruthy();
    const res = await client.post(`/api/user-profiles/${profile.id}/suspend`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('suspended');
    expect(await UserProfile.count()).toBe(2);
    expect(await UserAccount.count()).toBe(2);
    await expect(userLogin.login('customer', 'password123'))
      .rejects.toMatchObject({ status: 403, message: 'This user profile is suspended.' });
    expect((await client.post(`/api/user-profiles/${profile.id}/suspend`)).status).toBe(200);
    expect((await client.post('/api/user-profiles/9999/suspend')).status).toBe(404);
  });

  // Check this scenario: activating a suspended profile lets its accounts log in again.
  test('activating a suspended profile lets its accounts log in again', async () => {
    const profile = await UserProfile.create({ name: 'Customer', status: 'suspended' });
    await UserAccount.create({ username: 'customer', password: await bcrypt.hash('password123', 4),
      name: 'Customer', email: 'c@example.com', profileId: profile.id });
    await expect(userLogin.login('customer', 'password123'))
      .rejects.toMatchObject({ status: 403, message: 'This user profile is suspended.' });
    const res = await client.post(`/api/user-profiles/${profile.id}/activate`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect((await userLogin.login('customer', 'password123')).account).toBeTruthy();
    expect((await client.post(`/api/user-profiles/${profile.id}/activate`)).status).toBe(200);
    expect((await client.post('/api/user-profiles/9999/activate')).status).toBe(404);
    expect((await client.post('/api/user-profiles/not-an-id/activate')).status).toBe(400);
  });

  // Check this scenario: lists and searches profiles by name or description, ignoring case.
  test('lists and searches profiles by name or description, ignoring case', async () => {
    await UserProfile.bulkCreate([
      { name: 'Customer', description: 'Home owners' },
      { name: 'Interior Designer', description: 'Design studios', status: 'suspended' },
    ]);
    expect((await client.get('/api/user-profiles')).body).toHaveLength(3);
    const res = await client.get('/api/user-profiles').query({ keyword: '  STUDIO  ' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Interior Designer');
    expect((await client.get('/api/user-profiles').query({ keyword: 'missing' })).body).toEqual([]);
    expect((await client.get('/api/user-profiles').query({ keyword: '%' })).body).toEqual([]);
    expect((await client.get('/api/user-profiles?keyword=a&keyword=b')).status).toBe(400);
  });
});
