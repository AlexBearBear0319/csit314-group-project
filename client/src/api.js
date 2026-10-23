const BASE_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
let csrfToken = '';
let unauthorizedHandler = () => {};

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.errors = data?.errors || {};
  }
}

export function setCsrfToken(value) {
  csrfToken = value || '';
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : () => {};
}

async function request(method, path, body) {
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
    throw new ApiError('The server could not be reached. Check the API address and try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.toLowerCase().includes('application/json')) {
    data = await response.json().catch(() => null);
  } else if (!response.ok) {
    throw new ApiError('The API route did not return JSON. Check the website and API routing.', { status: response.status });
  }

  if (!response.ok) {
    const error = new ApiError(data?.message || `Request failed (${response.status}).`, { status: response.status, data });
    if (response.status === 401 && !['/login', '/session', '/register/customer', '/register/designer'].includes(path)) {
      unauthorizedHandler();
    }
    throw error;
  }

  if (data === null) throw new ApiError('The API sent an invalid response.', { status: response.status });
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
