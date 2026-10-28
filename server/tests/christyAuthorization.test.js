const request = require('supertest');
const app = require('../src/app');
const { sequelize, UserProfile, IDPCategory } = require('../src/entity');
const { featureSession, ORIGIN } = require('./helpers/featureSession');
beforeEach(async () => { await sequelize.sync({ force: true }); });
afterAll(async () => { await sequelize.close(); });
const routes = [
  ['get', '/api/user-profiles'], ['post', '/api/user-profiles'],
  ['get', '/api/user-profiles/999'], ['put', '/api/user-profiles/999'],
  ['post', '/api/user-profiles/999/suspend'],
  ['get', '/api/idp-categories'], ['post', '/api/idp-categories'],
  ['get', '/api/idp-categories/999'], ['put', '/api/idp-categories/999'],
  ['delete', '/api/idp-categories/999'],
];
test.each(routes)('%s %s requires a server session', async (method, path) => {
  const result = await request(app)[method](path).set('Origin', ORIGIN).send({ name: 'Test' });
  expect(result.status).toBe(401);
});
test.each(['Customer', 'Interior Designer'])('%s cannot manage either feature', async (role) => {
  const { client } = await featureSession(role);
  for (const [method, path] of routes) expect((await client[method](path).send({ name: 'Test' })).status).toBe(403);
});
test('admin and manager cannot use each other’s management routes', async () => {
  const admin = await featureSession('User Admin', 'admin');
  const manager = await featureSession('Platform Manager', 'manager');
  for (const [method, path] of routes) {
    const wrong = path.includes('user-profiles') ? manager : admin;
    expect((await wrong.client[method](path).send({ name: 'Test' })).status).toBe(403);
  }
});
test.each([['User Admin', '/api/user-profiles'], ['Platform Manager', '/api/idp-categories']])
('%s mutations require CSRF and a trusted origin', async (role, path) => {
  const { agent, client } = await featureSession(role);
  expect((await agent.post(path).set('Origin', ORIGIN).send({ name: 'Test' })).status).toBe(403);
  expect((await agent.post(path).set('Origin', ORIGIN).set('X-CSRF-Token', 'wrong').send({ name: 'Test' })).status).toBe(403);
  expect((await client.post(path).set('Origin', 'https://untrusted.example').send({ name: 'Test' })).status).toBe(403);
  expect((await client.post(path).send({ name: 'Test' })).status).toBe(201);
});
test('suspending a profile blocks its existing session and future login', async () => {
  const admin = await featureSession('User Admin', 'admin');
  const manager = await featureSession('Platform Manager', 'manager');
  const response = await admin.client.post(`/api/user-profiles/${manager.profile.id}/suspend`);
  expect(response.status).toBe(200);
  expect((await manager.client.get('/api/idp-categories')).status).toBe(401);
  expect((await manager.agent.post('/api/login').set('Origin', ORIGIN)
    .send({ username: 'manager', password: 'password123' })).status).toBe(403);
  expect(await UserProfile.findByPk(manager.profile.id)).not.toBeNull();
  expect(await IDPCategory.count()).toBe(0);
});
