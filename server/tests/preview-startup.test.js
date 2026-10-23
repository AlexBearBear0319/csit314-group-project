jest.mock('dotenv', () => ({ config: jest.fn() }));

const request = require('supertest');

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
};

afterAll(() => {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('Vercel Preview starts without a database URL and serves API health', async () => {
  process.env.NODE_ENV = 'production';
  process.env.VERCEL_ENV = 'preview';
  delete process.env.DATABASE_URL;

  let app;
  let sequelize;
  jest.isolateModules(() => {
    app = require('../src/app');
    sequelize = require('../src/db');
  });

  try {
    expect(sequelize.getDialect()).toBe('postgres');
    await request(app).get('/api/health').expect(200, { status: 'ok' });
    await request(app).get('/api/session').expect(401);
  } finally {
    await sequelize.close();
  }
});

test('Production still requires DATABASE_URL', () => {
  process.env.NODE_ENV = 'production';
  process.env.VERCEL_ENV = 'production';
  delete process.env.DATABASE_URL;

  expect(() => {
    jest.isolateModules(() => require('../src/db'));
  }).toThrow('DATABASE_URL is missing.');
});
