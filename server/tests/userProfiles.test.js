const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { sequelize, UserProfile, UserAccount } = require('../src/entity');

beforeEach(async () => { await sequelize.sync({ force: true }); });
afterAll(async () => { await sequelize.close(); });

describe('User profile stories #1–5', () => {
  test('creates an active profile and trims its fields', async () => {
    const res = await request(app).post('/api/user-profiles')
      .send({ name: ' Customer ', description: ' Home owners ', status: 'suspended' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Customer', description: 'Home owners', status: 'active' });
    expect(await UserProfile.count()).toBe(1);
  });

  test.each([{}, { name: '' }, { name: '   ' }, { name: 4 },
    { name: 'x'.repeat(256) }, { name: 'Customer', description: [] }])
  ('rejects invalid create input %j', async (body) => {
    const res = await request(app).post('/api/user-profiles').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
    expect(await UserProfile.count()).toBe(0);
  });

  test('rejects a duplicate profile name', async () => {
    await UserProfile.create({ name: 'Customer' });
    const res = await request(app).post('/api/user-profiles').send({ name: 'Customer' });
    expect(res.status).toBe(409);
  });

  test('views one profile and returns 404 for a missing profile', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    const res = await request(app).get(`/api/user-profiles/${profile.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Customer');
    expect((await request(app).get('/api/user-profiles/9999')).status).toBe(404);
    expect((await request(app).get('/api/user-profiles/not-an-id')).status).toBe(400);
    expect((await request(app).get('/api/user-profiles/2147483648')).status).toBe(400);
  });

  test('updates only editable fields without changing account links or status', async () => {
    const profile = await UserProfile.create({ name: 'Customer', status: 'suspended' });
    const account = await UserAccount.create({ username: 'a', password: 'hash', name: 'A',
      email: 'a@example.com', profileId: profile.id });
    const res = await request(app).put(`/api/user-profiles/${profile.id}`)
      .send({ name: 'Homeowner', description: 'Updated', status: 'active', id: 999 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: profile.id, name: 'Homeowner', status: 'suspended' });
    await account.reload();
    expect(account.profileId).toBe(profile.id);
  });

  test('invalid and duplicate updates leave the profile unchanged', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    await UserProfile.create({ name: 'Designer' });
    expect((await request(app).put(`/api/user-profiles/${profile.id}`).send({ name: ' ' })).status).toBe(400);
    expect((await request(app).put(`/api/user-profiles/${profile.id}`).send({ name: 'Designer' })).status).toBe(409);
    await profile.reload();
    expect(profile.name).toBe('Customer');
    expect((await request(app).put('/api/user-profiles/9999').send({ name: 'Valid' })).status).toBe(404);
  });

  test('suspension keeps the profile and accounts, and blocks their login', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    await UserAccount.create({ username: 'customer', password: await bcrypt.hash('password123', 4),
      name: 'Customer', email: 'c@example.com', profileId: profile.id });
    expect((await UserAccount.login('customer', 'password123', 'Customer')).account).toBeTruthy();
    const res = await request(app).post(`/api/user-profiles/${profile.id}/suspend`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('suspended');
    expect(await UserProfile.count()).toBe(1);
    expect(await UserAccount.count()).toBe(1);
    expect((await UserAccount.login('customer', 'password123', 'Customer')).reason).toBe('profile-suspended');
    expect((await request(app).post(`/api/user-profiles/${profile.id}/suspend`)).status).toBe(200);
    expect((await request(app).post('/api/user-profiles/9999/suspend')).status).toBe(404);
  });

  test('lists and searches profiles by name or description, ignoring case', async () => {
    await UserProfile.bulkCreate([
      { name: 'Customer', description: 'Home owners' },
      { name: 'Interior Designer', description: 'Design studios', status: 'suspended' },
    ]);
    expect((await request(app).get('/api/user-profiles')).body).toHaveLength(2);
    const res = await request(app).get('/api/user-profiles').query({ keyword: '  STUDIO  ' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Interior Designer');
    expect((await request(app).get('/api/user-profiles').query({ keyword: 'missing' })).body).toEqual([]);
    expect((await request(app).get('/api/user-profiles').query({ keyword: '%' })).body).toEqual([]);
    expect((await request(app).get('/api/user-profiles?keyword=a&keyword=b')).status).toBe(400);
  });
});
