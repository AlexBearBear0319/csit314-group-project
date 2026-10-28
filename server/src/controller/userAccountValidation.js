// =============================================================================
// CONTROLLER HELPER: userAccountValidation.js
// Shared input checks used by the 5 user account controllers (#6-10).
//
// Why a separate file? Create (#6) and Update (#8) check the same fields.
// Writing the rules once here means they can never get out of sync.
//
// The rules match customer and designer sign-up in SessionController.js
// (Alex's code), so an account made by a User Admin follows the same rules as
// one made through sign-up.
//
// This file exports 3 things:
//   RequestError  - an error that carries an HTTP status code
//   accountId     - turns the ID from the URL into a number
//   accountValues - checks and cleans the fields from the request body
// =============================================================================

// We need UserProfile (an entity) to check that the chosen profile exists.
// Controllers may call entities; that is the Controller -> Entity arrow in BCE.
const { UserProfile } = require('../entity');

// ---- The rules ---------------------------------------------------------------
// A "regular expression" (regex) is a pattern for checking text.

// Email: some text, then @, then some text, then a dot, then some text.
//   ^ start of text   [^\s@]+ one or more characters that are not a space or @
//   \. a real dot      $ end of text
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// User ID: 3 to 64 characters, only letters, numbers, dot, underscore, hyphen.
//   [a-zA-Z0-9._-] the allowed characters   {3,64} between 3 and 64 of them
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;

// Password length rules. bcrypt (the password scrambler) only reads the first
// 72 bytes, so anything longer would be silently cut off. We reject it instead.
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

// ---- RequestError ------------------------------------------------------------
// A normal JavaScript Error only has a message. This one also carries:
//   status - the HTTP status code to send (400, 404, 409)
//   errors - optional { fieldName: 'message' } list, so the page can show each
//            message next to the right box
// "class X extends Error" means: RequestError is a kind of Error with extras.
// When a controller "throw"s one, the error handler at the bottom of
// routes/userAccounts.js reads error.status and sends it to the browser.
class RequestError extends Error {
  // constructor runs when you write: new RequestError(409, 'message', {...})
  constructor(status, message, errors) {
    super(message); // let the built-in Error class store the message
    this.status = status; // save the extras on the new object
    this.errors = errors;
  }
}

// ---- accountId -----------------------------------------------------------------
// The ID in the URL (/user-accounts/5) arrives as text: "5".
// Turn it into a number and make sure it is a real ID (a whole number from 1 up).
// "abc", "1.5" or "-3" can never match an account, so we answer 404 Not Found.
function accountId(value) {
  const id = Number(value); // "5" -> 5,  "abc" -> NaN (Not a Number)
  if (!Number.isInteger(id) || id < 1) throw new RequestError(404, 'User account not found.');
  return id;
}

// ---- accountValues -----------------------------------------------------------
// Checks every field in body and returns a clean copy (trimmed, lowercased).
// If ANY field is wrong, it throws ONE 400 error listing ALL the problems, so
// the user can fix everything in one go.
//
//   body    - the JSON the browser sent. "= {}" means: use an empty object if
//             nothing was sent, so body.username does not crash.
//   partial - false for Create (#6): every field is required.
//             true for Update (#8): only check the fields that were sent.
//   { partial = false } = {} is "destructuring with defaults": it reads the
//   partial setting from the second argument, or uses false if not given.
//
// "async" because checking the profile needs the database (it takes time).
async function accountValues(body = {}, { partial = false } = {}) {
  const values = {}; // the clean values we will return
  const errors = {}; // fieldName -> problem message

  // Small helper: was this field actually sent with a value?
  // (field) => ... is an "arrow function", a short way to write a function.
  const has = (field) => body[field] !== undefined && body[field] !== null && body[field] !== '';

  // Each block below reads: "if this is a Create, or if the field was sent,
  // then check it". For Update, fields that were not sent are skipped and
  // left unchanged in the database.

  // -- username (the login "User ID") --
  if (!partial || has('username')) {
    // Only accept text. .trim() removes spaces at the ends, .toLowerCase()
    // makes "Kaz.Test" and "kaz.test" the same user ID.
    // a ? b : c means: if a then b, else c.
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    // .test() returns true if the text matches the pattern.
    if (!USERNAME_PATTERN.test(username)) errors.username = 'Use 3 to 64 letters, numbers, dots, underscores or hyphens.';
    else values.username = username;
  }

  // -- password (plain text here; the entity scrambles it before saving) --
  if (!partial || has('password')) {
    const password = typeof body.password === 'string' ? body.password : '';
    // Buffer.byteLength counts bytes, not letters. Some characters (emoji,
    // Chinese) take more than 1 byte, and bcrypt's limit is in bytes.
    if (password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
      // `...${x}...` is a template string: it puts the value of x in the text.
      errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters and no more than ${PASSWORD_MAX_BYTES} bytes.`;
    } else values.password = password;
  }

  // -- name (the person's display name) --
  if (!partial || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) errors.name = 'Enter a name up to 100 characters.';
    else values.name = name;
  }

  // -- email --
  if (!partial || has('email')) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
    else values.email = email;
  }

  // -- profileId (which role: User Admin, Interior Designer, Customer, Platform Manager) --
  if (!partial || has('profileId')) {
    const profileId = Number(body.profileId);
    // Only ask the database if the ID looks valid. findByPk = "find by primary
    // key" (find the row with this ID). It returns null if there is none.
    const profile = Number.isInteger(profileId) && profileId > 0 ? await UserProfile.findByPk(profileId) : null;
    if (!profile) errors.profileId = 'Choose a user profile.';
    else values.profileId = profileId;
  }

  // -- dob (date of birth). Optional, even for Create. --
  if (has('dob')) {
    const dob = String(body.dob);
    // Must look like YYYY-MM-DD AND be a real date. Three checks, in order:
    //   1. the pattern: 4 digits, dash, 2 digits, dash, 2 digits
    //   2. JavaScript can read it as a date at all. "2026-13-01" (month 13)
    //      gives an "Invalid Date", and getTime() of that is NaN.
    //   3. reading it back gives the same text. This catches 2026-02-31:
    //      JavaScript rolls it over to 3 March, which no longer matches.
    // && stops at the first false, so check 3 never runs on an invalid date.
    const date = new Date(`${dob}T00:00:00Z`);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(dob)
      && Number.isFinite(date.getTime())
      && date.toISOString().slice(0, 10) === dob;
    if (!valid) errors.dob = 'Enter a valid date of birth.';
    else values.dob = dob;
  }

  // -- status: only on Update (#8), and only to reactivate --
  // Reactivating a suspended account is an alternative flow of Update (#8):
  // the admin sets the status back to 'active'. Setting 'suspended' here is
  // refused, so suspending always goes through Suspend (#9), which has the
  // "cannot suspend your own account" rule. On Create, status is ignored:
  // new accounts always start active.
  if (partial && has('status')) {
    if (body.status !== 'active') errors.status = 'Use Suspend to suspend an account.';
    else values.status = 'active';
  }

  // Object.keys(errors) lists the field names that have a problem.
  // If there is at least one, stop and send 400 Bad Request with all of them.
  if (Object.keys(errors).length) throw new RequestError(400, 'Check the fields and try again.', errors);

  // Everything is fine: return the clean values for the controller to use.
  return values;
}

// Make these 3 available to the controllers, e.g.
//   const { RequestError, accountValues } = require('./userAccountValidation');
module.exports = { RequestError, accountId, accountValues };
