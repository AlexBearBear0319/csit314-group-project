import { useSyncExternalStore } from 'react';
import { api, setCsrfToken } from './api';

export const ROLES = ['User Admin', 'Interior Designer', 'Customer', 'Platform Manager'];

const HOME = {
  'User Admin': '/admin',
  'Interior Designer': '/designer',
  Customer: '/customer',
  'Platform Manager': '/manager',
};

let snapshot = { user: null, ready: false };
let hydration = null;
const listeners = new Set();

function publish(user, ready = true, token = '') {
  setCsrfToken(token);
  snapshot = { user, ready };
  listeners.forEach((listener) => listener());
}

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

export function setUser(account, token) {
  publish({ id: account.id, username: account.username, name: account.name, role: account.role }, true, token);
}

export async function hydrateSession() {
  if (hydration) return hydration;
  hydration = api.get('/session')
    .then(({ account, csrfToken }) => publish(account, true, csrfToken))
    .catch(() => publish(null, true, ''))
    .finally(() => { hydration = null; });
  return hydration;
}

export async function killSession() {
  try {
    if (snapshot.user) await api.del('/session');
  } finally {
    publish(null, true, '');
  }
}

export function homeForRole(role) {
  return HOME[role] || '/login';
}
