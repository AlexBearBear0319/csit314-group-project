// =============================================================================
// BOUNDARY HELPER: inputRules
// Small checks that the boundary pages use in their validateInput() step.
//
// Why does the Boundary check the input?
//   The Boundary is the only layer the user sees, so it is the best place to
//   say "Enter a name" before anything is sent. The user gets the message at
//   once, next to the right box, and we do not waste a trip to the server.
//
// The controllers check the same rules again on the server (see the
// *Validation.js files in server/src/controller). Both sides use the same
// rules and limits. The server check is the safety net, because anyone can call the API
// without our page.
//
// Every check returns a message (text) when the value is wrong, and '' when it
// is fine. The pages collect these into { fieldName: 'message' } and show them
// under the boxes.
// =============================================================================

// Same patterns as the server.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72; // bcrypt only reads the first 72 bytes

// Text of any kind, trimmed. Anything that is not text counts as empty.
export function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// The message for a text that is too long. A page can pass its own wording
// (`tooLong`) so the message matches what the server says for that story.
function tooLongMessage(max, tooLong) {
  return tooLong || `Use ${max} characters or fewer.`;
}

// A required text box with a maximum length.
export function checkRequiredText(value, { label, max, tooLong }) {
  const clean = text(value);
  if (!clean) return `Enter a ${label}.`;
  if (clean.length > max) return tooLongMessage(max, tooLong);
  return '';
}

// An optional text box with a maximum length.
export function checkOptionalText(value, { max, tooLong }) {
  return text(value).length > max ? tooLongMessage(max, tooLong) : '';
}

// A password: long enough, and not more than 72 bytes (an emoji is more than 1 byte).
export function checkPassword(value) {
  const password = typeof value === 'string' ? value : '';
  const bytes = new TextEncoder().encode(password).length;
  if (password.length < PASSWORD_MIN_LENGTH || bytes > PASSWORD_MAX_BYTES) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters and no more than ${PASSWORD_MAX_BYTES} bytes.`;
  }
  return '';
}

// A real calendar date written as YYYY-MM-DD. Reading it back catches 2026-02-30.
export function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Removes the empty messages, so the page can ask "is the object empty?".
export function onlyProblems(problems) {
  return Object.fromEntries(Object.entries(problems).filter(([, message]) => message));
}
