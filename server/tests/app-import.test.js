const request = require('supertest');

afterEach(() => {
  jest.dontMock('../src/routes/index.js');
});

test.each(['commonjs', 'default'])('starts with a %s router export', async (shape) => {
  const express = require('express');
  const router = express.Router();
  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  let app;
  jest.isolateModules(() => {
    jest.doMock('../src/routes/index.js', () => shape === 'default' ? { default: router } : router);
    app = require('../src/app');
  });

  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});

test('rejects an invalid router export at startup', () => {
  jest.isolateModules(() => {
    jest.doMock('../src/routes/index.js', () => ({}));
    expect(() => require('../src/app')).toThrow('The API routes must export an Express router.');
  });
});
