// First unit test: proves Jest + Supertest work and the backend responds.
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
