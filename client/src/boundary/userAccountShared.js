// =============================================================================
// BOUNDARY HELPER: userAccountShared
// Shared by the user account pages (stories #6-10), so the field names, labels
// and wording are the same on every page.
//
//   statusLabel           turns 'active' into 'Active' for display
//   accountFields         the boxes of the Create and Update forms
//   validateAccountInput  the input check of the Create and Update forms
//   toRequestBody         turns the typed values into what the server expects
// =============================================================================

import {
  EMAIL_PATTERN, USERNAME_PATTERN, checkPassword, checkRequiredText, isRealDate, onlyProblems, text,
} from './inputRules';

// 'active' -> 'Active'. Shows '-' when there is no status.
export function statusLabel(status) {
  if (!status) return '-';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// The boxes of the Create and Update forms. FormFields draws one box for each entry.
//   profiles = the choices for the "User profile" dropdown
//   isUpdate = true on the Update page (the password is then optional)
export function accountFields(profiles, isUpdate = false) {
  return [
    { name: 'username', label: 'User ID', required: true, hint: '3 to 64 letters, numbers, dots, underscores or hyphens.' },
    {
      name: 'password',
      label: isUpdate ? 'New password' : 'Password', // different wording on the Update page
      type: 'password', // hides the typed letters
      required: !isUpdate,
      hint: isUpdate ? 'Leave blank to keep the current password.' : 'At least 12 characters.',
    },
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    {
      name: 'profileId',
      label: 'User profile',
      required: true,
      options: profiles.map((profile) => ({ value: String(profile.id), label: profile.name })),
    },
    { name: 'dob', label: 'Date of birth', type: 'date' },
  ];
}

// -----------------------------------------------------------------------------
// validateAccountInput
// The input check of the Create (#6) and Update (#8) forms. It uses the same
// rules as the server (server/src/controller/userAccountValidation.js).
// Returns { fieldName: 'message' } with only the wrong boxes.
//   isUpdate = on the Update page the password may stay empty, and then it is
//              not changed. A typed password still has to follow the rules.
// -----------------------------------------------------------------------------
export function validateAccountInput(values, { isUpdate = false } = {}) {
  const username = text(values.username).toLowerCase();
  const email = text(values.email).toLowerCase();
  const typedPassword = typeof values.password === 'string' && values.password !== '';

  return onlyProblems({
    username: USERNAME_PATTERN.test(username) ? '' : 'Use 3 to 64 letters, numbers, dots, underscores or hyphens.',
    password: isUpdate && !typedPassword ? '' : checkPassword(values.password),
    name: checkRequiredText(values.name, { label: 'name', max: 100 }),
    email: EMAIL_PATTERN.test(email) && email.length <= 254 ? '' : 'Enter a valid email address.',
    profileId: values.profileId ? '' : 'Choose a user profile.',
    dob: !values.dob || isRealDate(values.dob) ? '' : 'Enter a valid date of birth.',
  });
}

// Turns the typed values into the body the server expects.
export function toRequestBody(values) {
  const body = {
    username: values.username,
    name: values.name,
    email: values.email,
    profileId: Number(values.profileId), // the dropdown gives text, the server wants a number
  };
  if (values.password) body.password = values.password;
  if (values.dob) body.dob = values.dob;
  return body;
}
