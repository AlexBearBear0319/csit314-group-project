const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, UserProfile, UserAccount, UserSession } = require('../src/entity');
const SessionController = require('../src/controller/SessionController');
const { resetRateLimitsForTests } = require('../src/middleware/rateLimit');
const { resetAccountPassword } = require('../src/accountProvisioning');

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'a test password with enough length';
const ROLE_NAMES = ['User Admin', 'Interior Designer', 'Customer', 'Platform Manager'];

let profiles;
let accounts;

async function login(username, password = PASSWORD, extra = {}) {
  const client = request.agent(app);
  const response = await client
    .post('/api/login')
    .set('Origin', ORIGIN)
    .send({ username, password, ...extra });
  return { client, response };
}

async function register(path, values = {}) {
  return request(app)
    .post(path)
    .set('Origin', ORIGIN)
    .send({
      name: 'Test Person',
      email: 'new-person@example.com',
      username: 'new-person',
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
      ...values,
    });
}

beforeEach(async () => {
  resetRateLimitsForTests();
  await sequelize.sync({ force: true });
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  profiles = {};
  accounts = {};
  for (const role of ROLE_NAMES) {
    profiles[role] = await UserProfile.create({ name: role });
    accounts[role] = await UserAccount.create({
      username: role.toLowerCase().replaceAll(' ', '-'),
      password: passwordHash,
      name: `${role} Test`,
      email: `${role.toLowerCase().replaceAll(' ', '-')}@example.com`,
      profileId: profiles[role].id,
    });
  }
});

afterEach(() => jest.restoreAllMocks());

afterAll(async () => {
  await sequelize.close();
});

describe('account login and registration', () => {
  test('signs in all four roles without a role value in the request', async () => {
    for (const role of ROLE_NAMES) {
      const username = accounts[role].username;
      const { client, response } = await login(username);
      expect(response.status).toBe(200);
      expect(response.body.account.role).toBe(role);
      expect(response.body.account.email).toBe(accounts[role].email);
      expect(response.body.account).not.toHaveProperty('password');

      const current = await client.get('/api/session').expect(200);
      expect(current.body.account.id).toBe(accounts[role].id);
      expect(current.body.account.role).toBe(role);
      expect(Date.parse(current.body.expiresAt)).toBeGreaterThan(Date.now());
    }
  });

  test('uses the saved role when a request includes a false role', async () => {
    const { response } = await login(accounts.Customer.username, PASSWORD, { profile: 'User Admin' });
    expect(response.status).toBe(200);
    expect(response.body.account.role).toBe('Customer');
  });

  test('rejects wrong and plain-text imported passwords', async () => {
    await login(accounts.Customer.username, 'wrong password').then(({ response }) => {
      expect(response.status).toBe(401);
    });

    const plainText = await UserAccount.create({
      username: 'imported-plain',
      password: PASSWORD,
      name: 'Imported Account',
      email: 'imported@example.com',
      profileId: profiles.Customer.id,
    });
    expect(plainText.password).toBe(PASSWORD);
    const { response } = await login(plainText.username);
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/user ID or password/i);
  });

  test('rejects suspended accounts, suspended roles and unrecognized roles', async () => {
    await accounts.Customer.update({ status: 'suspended' });
    expect((await login(accounts.Customer.username)).response.status).toBe(403);
    await accounts.Customer.update({ status: 'active' });

    await profiles.Customer.update({ status: 'suspended' });
    expect((await login(accounts.Customer.username)).response.status).toBe(403);

    const unknownRole = await UserProfile.create({ name: 'Other Role' });
    const unknownAccount = await UserAccount.create({
      username: 'other-role',
      password: await bcrypt.hash(PASSWORD, 4),
      name: 'Other Role',
      email: 'other-role@example.com',
      profileId: unknownRole.id,
    });
    expect((await login(unknownAccount.username)).response.status).toBe(403);
  });

  test('registers a customer and ignores a requested privileged role', async () => {
    const response = await register('/api/register/customer', { role: 'User Admin' });
    expect(response.status).toBe(201);
    expect(response.body.account.role).toBe('Customer');
    expect(response.body.account.username).toBe('new-person');
    expect(response.body.account).not.toHaveProperty('password');

    const saved = await UserAccount.findByPk(response.body.account.id);
    expect(saved.profileId).toBe(profiles.Customer.id);
    expect(await bcrypt.compare(PASSWORD, saved.password)).toBe(true);
    expect(saved.password).not.toBe(PASSWORD);
  });

  test('registers an interior designer and creates an authenticated session', async () => {
    const client = request.agent(app);
    const response = await client
      .post('/api/register/designer')
      .set('Origin', ORIGIN)
      .send({ name: 'Designer Name', email: 'DESIGNER@example.com', username: 'New-Designer', password: PASSWORD, passwordConfirmation: PASSWORD });
    expect(response.status).toBe(201);
    expect(response.body.account.role).toBe('Interior Designer');
    expect(response.body.account.username).toBe('new-designer');
    expect(response.body.account.email).toBe('designer@example.com');
    expect((await client.get('/api/session').expect(200)).body.account.role).toBe('Interior Designer');
  });

  test('rejects duplicate user IDs and emails without changing existing accounts', async () => {
    const first = await register('/api/register/customer', { username: 'same-id', email: 'same@example.com' });
    expect(first.status).toBe(201);
    const duplicateId = await register('/api/register/designer', { username: 'SAME-ID', email: 'different@example.com' });
    expect(duplicateId.status).toBe(409);
    expect(duplicateId.body.errors.username).toBeTruthy();

    const duplicateEmail = await register('/api/register/customer', { username: 'other-id', email: 'SAME@example.com' });
    expect(duplicateEmail.status).toBe(409);
    expect(duplicateEmail.body.errors.email).toBeTruthy();
    expect(await UserAccount.count({ where: { username: 'same-id' } })).toBe(1);
  });

  test('keeps a failed registration transaction from leaving an account', async () => {
    jest.spyOn(SessionController, 'createSession').mockRejectedValueOnce(new Error('session write failed'));
    const response = await register('/api/register/customer');
    expect(response.status).toBe(500);
    expect(await UserAccount.count({ where: { username: 'new-person' } })).toBe(0);
  });

  test('limits repeated login attempts', async () => {
    let response;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      response = await login(accounts.Customer.username, 'wrong password');
    }
    expect(response.response.status).toBe(429);
  });
});

describe('session lifetime and password reset', () => {
  test('rejects an expired session and revokes a session on logout', async () => {
    const { client, response } = await login(accounts.Customer.username);
    expect(response.status).toBe(200);
    const session = await UserSession.findOne({ where: { accountId: accounts.Customer.id } });
    await session.update({ expiresAt: new Date(Date.now() - 1000) });
    await client.get('/api/session').expect(401);

    const active = await login(accounts.Customer.username);
    expect(active.response.status).toBe(200);
    await active.client
      .delete('/api/session')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', active.response.body.csrfToken)
      .expect(200);
    await active.client.get('/api/session').expect(401);
  });

  test('resets a password in place and removes old sessions', async () => {
    const { client, response } = await login(accounts.Customer.username);
    expect(response.status).toBe(200);
    const originalId = accounts.Customer.id;
    const originalProfile = accounts.Customer.profileId;

    await resetAccountPassword({ username: accounts.Customer.username, password: 'a different secure password' });

    await client.get('/api/session').expect(401);
    const saved = await UserAccount.findByPk(originalId);
    expect(saved.id).toBe(originalId);
    expect(saved.profileId).toBe(originalProfile);
    expect(await bcrypt.compare('a different secure password', saved.password)).toBe(true);
    expect(await UserSession.count({ where: { accountId: originalId } })).toBe(0);
  });
});
