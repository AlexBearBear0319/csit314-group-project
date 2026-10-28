import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';

const source = await readFile(new URL('../src/api.js', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source.replace('import.meta.env.VITE_API_URL', "''")).toString('base64')}`;
const { api, ApiError, setCsrfToken, setUnauthorizedHandler } = await import(moduleUrl);

afterEach(() => {
  setCsrfToken('');
  setUnauthorizedHandler(null);
});

test('a pending network request times out without waiting forever', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const result = assert.rejects(api.get('/session'), (error) => (
    error instanceof ApiError && error.message.includes('too long')
  ));
  t.mock.timers.tick(15000);
  await result;
});

test('the timeout also covers a response body that stops loading', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => ({
    ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
  }));
  const result = assert.rejects(api.get('/session'), /too long/);
  await Promise.resolve();
  t.mock.timers.tick(15000);
  await result;
});

test('a hosting error returns a usable error without ending a valid session', async (t) => {
  let ended = false;
  setUnauthorizedHandler(() => { ended = true; });
  t.mock.method(globalThis, 'fetch', async () => new Response('Function crashed', { status: 500 }));
  await assert.rejects(api.get('/session'), (error) => error instanceof ApiError && error.status === 500);
  assert.equal(ended, false);
});

test('401 ends a protected session but leaves login and initial session checks to their callers', async (t) => {
  let ended = 0;
  setUnauthorizedHandler(() => { ended += 1; });
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Sign in.' }, { status: 401 }));
  await assert.rejects(api.get('/session'), { status: 401 });
  await assert.rejects(api.post('/login', {}), { status: 401 });
  assert.equal(ended, 0);
  await assert.rejects(api.get('/designer/current-idps'), { status: 401 });
  assert.equal(ended, 1);
});

test('successful writes keep cookies and CSRF protection', async (t) => {
  let options;
  setCsrfToken('test-csrf');
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, '/api/designer/current-idps');
    options = init;
    return Response.json({ id: 1 });
  });
  assert.deepEqual(await api.post('/designer/current-idps', { name: 'Test project' }), { id: 1 });
  assert.equal(options.credentials, 'include');
  assert.equal(options.headers['X-CSRF-Token'], 'test-csrf');
  assert.equal(options.signal.aborted, false);
});

test('invalid JSON is reported as an API error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{', { headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(api.get('/session'), (error) => error instanceof ApiError && error.message.includes('invalid response'));
});


test('changing a search cancels its request without showing a timeout error', async (t) => {
  const caller = new AbortController();
  let signal;
  t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((_resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const result = assert.rejects(api.get('/user-profiles?keyword=old', { signal: caller.signal }),
    { name: 'AbortError' });
  caller.abort();
  await result;
  assert.equal(signal.aborted, true);
});
