// =============================================================================
// CONTROLLER HELPER: userAccountValidation
// Input rules for the user account stories (#6 create and #8 update).
//
// Why is there a check here when the page already checks the input?
//   The Boundary (CreateUserAccountPg / UpdateUserAccountPg) checks first, so
//   the User Admin sees a message straight away. We check again here because
//   anyone can call the API without our page (for example from a test tool),
//   and the database must never receive unchecked data.
//
// The rules are the same as sign-up (RegisterAccountC), so an account made by
// a User Admin follows the same rules as one made through sign-up.
//
// This file has no database code. Checks that need the database (does this
// profile exist? is this user ID taken?) are done in the controller.
// =============================================================================

const RequestError = require('./RequestError');

// Email: some text, then @, then some text, then a dot, then some text.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// User ID: 3 to 64 characters, only letters, numbers, dot, underscore, hyphen.
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;

// bcrypt (the password scrambler) only reads the first 72 bytes. A longer
// password would be cut off silently, so we refuse it instead.
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

// -----------------------------------------------------------------------------
// accountId
// The ID in the web address (/user-accounts/5) arrives as text. This turns it
// into a number. "abc", "1.5" or "-3" can never match an account, so we answer
// 404 Not Found straight away.
// -----------------------------------------------------------------------------
function accountId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new RequestError(404, 'User account not found.');
  return id;
}

// -----------------------------------------------------------------------------
// checkAccountFields
// Checks every field in body and returns a clean copy (trimmed, lowercased).
//   body    = what the page sent
//   partial = false for Create (#6): every field is required
//             true for Update (#8): only the fields that were sent are checked
// Returns { values, errors }. The caller throws one 400 error if errors has
// anything, so the user can fix every box in one go.
// The profile is only checked for its shape here. Whether it exists is checked
// by the controller, because that needs the database.
// -----------------------------------------------------------------------------
function checkAccountFields(body = {}, { partial = false } = {}) {
  const values = {};
  const errors = {};
  const has = (field) => body[field] !== undefined && body[field] !== null && body[field] !== '';

  // Check 1: username (the login "User ID")
  if (!partial || has('username')) {
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (!USERNAME_PATTERN.test(username)) errors.username = 'Use 3 to 64 letters, numbers, dots, underscores or hyphens.';
    else values.username = username;
  }

  // Check 2: password (plain text here; the controller hashes it before saving)
  if (!partial || has('password')) {
    const password = typeof body.password === 'string' ? body.password : '';
    // Buffer.byteLength counts bytes, not letters. An emoji takes more than 1
    // byte, and the bcrypt limit is in bytes.
    if (password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
      errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters and no more than ${PASSWORD_MAX_BYTES} bytes.`;
    } else values.password = password;
  }

  // Check 3: name (the person's display name)
  if (!partial || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) errors.name = 'Enter a name up to 100 characters.';
    else values.name = name;
  }

  // Check 4: email
  if (!partial || has('email')) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
    else values.email = email;
  }

  // Check 5: profileId (which role). Shape only: a whole number from 1 up.
  if (!partial || has('profileId')) {
    const profileId = Number(body.profileId);
    if (!Number.isInteger(profileId) || profileId < 1) errors.profileId = 'Choose a user profile.';
    else values.profileId = profileId;
  }

  // Check 6: dob (date of birth). Optional, even for Create.
  if (has('dob')) {
    const dob = String(body.dob);
    // Three checks: the YYYY-MM-DD pattern, a date JavaScript can read, and
    // reading it back gives the same text. The last one catches 2026-02-31,
    // which JavaScript would roll over to 3 March.
    const date = new Date(`${dob}T00:00:00Z`);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(dob)
      && Number.isFinite(date.getTime())
      && date.toISOString().slice(0, 10) === dob;
    if (!valid) errors.dob = 'Enter a valid date of birth.';
    else values.dob = dob;
  }

  // Check 7: status. Only on Update (#8), and only to reactivate.
  // Suspending always goes through Suspend (#9), which has the "cannot suspend
  // your own account" rule. On Create the status is ignored: a new account
  // always starts active.
  if (partial && has('status')) {
    if (body.status !== 'active') errors.status = 'Use Suspend to suspend an account.';
    else values.status = 'active';
  }

  return { values, errors };
}

module.exports = { accountId, checkAccountFields, PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES, EMAIL_PATTERN, USERNAME_PATTERN };
