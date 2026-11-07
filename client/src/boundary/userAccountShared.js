// =============================================================================
// SHARED HELPERS for the User Account boundary pages (stories #6-10).
// Used by SearchUserAccountPg, CreateUserAccountPg, ViewUserAccountPg,
// UpdateUserAccountPg and SuspendUserAccountPg, so the field names, labels and
// wording stay the same on every page.
//
// This file gives other files 3 functions:
//   statusLabel   - turns a status into nice text to show
//   accountFields - lists the boxes on the Create and Update forms
//   toRequestBody - turns the typed form values into what the backend expects
//
// "export" means other files are allowed to load that function.
// =============================================================================

// =============================================================================
// FUNCTION: statusLabel
// WHAT IT DOES: turns 'active' into 'Active' and 'suspended' into 'Suspended'
// for display.
// RECEIVES: status = the status text from the backend.
// GIVES BACK: the same word with a capital first letter, or '-' if it is empty.
// =============================================================================
export function statusLabel(status) {
  // ! means "not". If there is no status, show a dash and stop here.
  if (!status) return '-';
  // charAt(0) is the first letter; slice(1) is everything after it.
  return status.charAt(0).toUpperCase() + status.slice(1);
} // End of statusLabel.

// =============================================================================
// FUNCTION: accountFields
// WHAT IT DOES: lists the fields on the Create and Update forms. FormFields (a
// shared component) draws one box per entry.
//   name     - the key sent to the backend (must match the API)
//   label    - the text shown above the box
//   type     - the kind of box: 'password', 'email', 'date' (default: text)
//   options  - turns the box into a dropdown
//   required - the browser will not submit while this is empty
//   hint     - small help text under the box
//
// RECEIVES:
//   profiles  = the list from GET /api/user-accounts/profiles, for the dropdown
//   isUpdate  = true on the Update page: the password becomes optional there
// GIVES BACK: the list of fields.
// =============================================================================
export function accountFields(profiles, isUpdate = false) {
  // Hand back the list. Each { } below describes one box on the form.
  return [
    // Box 1: the user ID. It is required.
    { name: 'username', label: 'User ID', required: true, hint: '3 to 64 letters, numbers, dots, underscores or hyphens.' },
    // Box 2: the password. a ? b : c means: if a then b, else c.
    {
      name: 'password', // the key sent to the backend
      label: isUpdate ? 'New password' : 'Password', // different wording on the Update page
      type: 'password', // hides the typed letters
      required: !isUpdate, // required on Create, optional on Update
      hint: isUpdate ? 'Leave blank to keep the current password.' : 'At least 12 characters.', // the help text
    },
    // Box 3: the person's name. It is required.
    { name: 'name', label: 'Name', required: true },
    // Box 4: the email. It is required.
    { name: 'email', label: 'Email', type: 'email', required: true },
    // Box 5: the dropdown of user profiles (roles).
    {
      name: 'profileId', // the key sent to the backend
      label: 'User profile', // the text above the dropdown
      required: true, // the user must choose one
      // .map turns each profile { id, name } into a dropdown choice { value, label }.
      // String(...) because dropdown values are always text.
      options: profiles.map((profile) => ({ value: String(profile.id), label: profile.name })),
    },
    // Box 6: the date of birth. It is optional.
    { name: 'dob', label: 'Date of birth', type: 'date' },
  ];
} // End of accountFields.

// =============================================================================
// FUNCTION: toRequestBody
// WHAT IT DOES: turns the form's values into what the backend expects.
// - Empty optional fields are left out (so Update does not change them).
// - The password is only sent if one was typed.
// RECEIVES: values = everything typed into the form.
// GIVES BACK: the data to send to the backend.
// =============================================================================
export function toRequestBody(values) {
  // Start with the fields that are always sent.
  const body = {
    username: values.username, // the user ID
    name: values.name, // the person's name
    email: values.email, // the email
    profileId: Number(values.profileId), // the dropdown gives text; the API wants a number
  };
  // Add the password only if one was typed.
  if (values.password) body.password = values.password;
  // Add the date of birth only if one was chosen.
  if (values.dob) body.dob = values.dob;
  // Hand back the finished data.
  return body;
} // End of toRequestBody.
