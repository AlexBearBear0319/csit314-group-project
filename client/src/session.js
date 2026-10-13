// session.js — remembers who is logged in (in the browser tab) and their role.
// Roles must match the profile names in the database seed.
export const ROLES = ['User Admin', 'Interior Designer', 'Customer', 'Platform Manager'];

const KEY = 'csit314-user';

export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function setUser(user) {
  sessionStorage.setItem(KEY, JSON.stringify(user));
}

// killSession() — used by the Logout boundary (LogoutPg)
export function killSession() {
  sessionStorage.removeItem(KEY);
}
