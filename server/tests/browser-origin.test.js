const { allowedOrigins, isTrustedOrigin } = require('../src/security/browserOrigin');

const environment = {
  FRONTEND_URL: process.env.FRONTEND_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
};

afterEach(() => {
  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('allows the configured frontend and the current and production Vercel domains', () => {
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.VERCEL_URL = 'csit314-group-project-preview.vercel.app';
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'csit314-group-project.vercel.app';

  expect(isTrustedOrigin('http://localhost:5173')).toBe(true);
  expect(isTrustedOrigin('https://csit314-group-project-preview.vercel.app')).toBe(true);
  expect(isTrustedOrigin('https://csit314-group-project.vercel.app')).toBe(true);
  expect(isTrustedOrigin('https://untrusted.example')).toBe(false);
  expect([...allowedOrigins()]).toEqual([
    'http://localhost:5173',
    'https://csit314-group-project-preview.vercel.app',
    'https://csit314-group-project.vercel.app',
  ]);
});
