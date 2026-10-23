// First unit test: proves Jest + Supertest work and the backend responds.
const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/entity');
const { setStorageAdapterForTests } = require('../src/storage/IdpImageStorage');

beforeAll(async () => {
  await sequelize.sync({ force: true });
  setStorageAdapterForTests({ checkReady: async () => true });
});

afterAll(async () => {
  setStorageAdapterForTests(null);
  await sequelize.close();
});

describe('GET /api/health', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('reports the API, database, schema and Storage checks', async () => {
    const res = await request(app).get('/api/health/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'ready',
      checks: { api: 'ok', database: 'ok', schema: 'ok', storage: 'ok' },
    });
  });
});
