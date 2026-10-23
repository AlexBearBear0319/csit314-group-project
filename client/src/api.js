const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let csrfToken = '';

export function setCsrfToken(value) {
  csrfToken = value || '';
}

async function request(method, path, body) {
  if (import.meta.env.PROD && !BASE_URL) {
    throw new Error('The server address is not set for this website.');
  }
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('The server could not be reached. Check the API address and try again.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status}).`);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
