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

async function request(method, path, body, options = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const controller = new AbortController();
  const cancel = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.toLowerCase().includes('application/json')) {
      data = await response.json();
    } else {
      throw new ApiError('The server is unavailable. Try again later.', { status: response.status });
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
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('The server took too long to respond. Try again.');
    }
    if (error instanceof SyntaxError) throw new ApiError('The API sent an invalid response.');
    throw new ApiError('The server could not be reached. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}

export const api = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
