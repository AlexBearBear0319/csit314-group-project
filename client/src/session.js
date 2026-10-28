import { useSyncExternalStore } from 'react';
import { ApiError, api, setCsrfToken, setUnauthorizedHandler } from './api';

const HOME = {
  'User Admin': '/admin',
  'Interior Designer': '/designer',
  Customer: '/customer',
  'Platform Manager': '/manager',
};

let snapshot = { user: null, status: 'checking', expiresAt: null, error: '' };
let hydration = null;
let revision = 0;
let expiryTimer = null;
const listeners = new Set();

function publish(user, status, token = '', expiresAt = null, error = '') {
  setCsrfToken(token);
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  snapshot = { user, status, expiresAt, error };
  listeners.forEach((listener) => listener());
  if (user && expiresAt) {
    const remaining = Date.parse(expiresAt) - Date.now();
    if (remaining <= 0) {
      expireSession();
    } else {
      expiryTimer = setTimeout(expireSession, Math.min(remaining, 2_147_000_000));
    }
  }
}

function expireSession() {
  revision += 1;
  publish(null, 'anonymous');
}

setUnauthorizedHandler(expireSession);

export function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionSnapshot() {
  return snapshot;
}

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
}

export function getUser() {
  return snapshot.user;
}

export function setUser(account, token, expiresAt) {
  revision += 1;
  publish({
    id: account.id,
    username: account.username,
    name: account.name,
    email: account.email || '',
    photo: account.photo || null,
    role: account.role,
  }, 'authenticated', token, expiresAt);
}

export async function hydrateSession() {
  if (hydration) return hydration;
  const requestRevision = revision;
  hydration = api.get('/session')
    .then(({ account, csrfToken, expiresAt }) => {
      if (requestRevision === revision) setUser(account, csrfToken, expiresAt);
    })
    .catch((error) => {
      if (requestRevision !== revision) return;
      if (error instanceof ApiError && error.status === 401) {
        publish(null, 'anonymous');
      } else if (!snapshot.user) {
        publish(null, 'unavailable', '', null, error.message || 'The server could not be reached.');
      }
    })
    .finally(() => { hydration = null; });
  return hydration;
}

export async function killSession() {
  if (!snapshot.user) {
    revision += 1;
    publish(null, 'anonymous');
    return;
  }
  try {
    await api.del('/session');
    revision += 1;
    publish(null, 'anonymous');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      revision += 1;
      publish(null, 'anonymous');
      return;
    }
    throw error;
  }
}

export function homeForRole(role) {
  return HOME[role] || '/login';
}
