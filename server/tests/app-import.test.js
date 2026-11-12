// BCE: Outside BCE (test or test support).
// Checks that the Express application can be imported under the tested configuration.

// =============================================================================
// TESTS: app startup
// The app refuses to start if the routes file does not export a router.
// =============================================================================

const request = require('supertest');

afterEach(() => {
  jest.dontMock('../src/routes/index.cjs');
});

test.each(['commonjs', 'default', 'nested-default', 'named-router'])('starts with a %s router export', async (shape) => {
  const express = require('express');
  const router = express.Router();
  // Register the GET handler for /health relative to this router.
  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  let app;
  jest.isolateModules(() => {
    const exportsByShape = {
      commonjs: router,
      default: { default: router },
      'nested-default': { default: { default: router } },
      'named-router': { router },
    };
    jest.doMock('../src/routes/index.cjs', () => exportsByShape[shape]);
    app = require('../src/app');
  });

  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});

// Check this scenario: rejects an invalid router export at startup.
test('rejects an invalid router export at startup', () => {
  jest.isolateModules(() => {
    jest.doMock('../src/routes/index.cjs', () => ({}));
    expect(() => require('../src/app')).toThrow('The API routes must export an Express router.');
  });
});
