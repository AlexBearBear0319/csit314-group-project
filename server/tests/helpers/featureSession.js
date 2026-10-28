const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { UserProfile, UserAccount } = require('../../src/entity');
const { resetRateLimitsForTests } = require('../../src/middleware/rateLimit');
const ORIGIN = 'http://localhost:5173';
async function featureSession(role, username = 'feature-owner') {
  resetRateLimitsForTests();
  const [profile] = await UserProfile.findOrCreate({ where: { name: role } });
  const account = await UserAccount.create({ username, password: await bcrypt.hash('password123', 4),
    name: username, email: `${username}@example.com`, profileId: profile.id });
  const agent = request.agent(app);
  const login = await agent.post('/api/login').set('Origin', ORIGIN)
    .send({ username, password: 'password123' });
  expect(login.status).toBe(200);
  const client = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map((method) =>
    [method, (path) => agent[method](path).set('Origin', ORIGIN).set('X-CSRF-Token', login.body.csrfToken)]));
  return { client, agent, csrfToken: login.body.csrfToken, profile, account };
}
module.exports = { featureSession, ORIGIN };
