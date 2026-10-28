// =============================================================================
// SHARED HELPERS for the User Account boundary pages (stories #6-10).
// Used by SearchUserAccountPg, CreateUserAccountPg, ViewUserAccountPg,
// UpdateUserAccountPg and SuspendUserAccountPg, so the field names, labels and
// wording stay the same on every page.
// =============================================================================

// Turns 'active' into 'Active' and 'suspended' into 'Suspended' for display.
// charAt(0) is the first letter; slice(1) is everything after it.
export function statusLabel(status) {
  if (!status) return '-';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// The fields on the Create and Update forms. FormFields (a shared component)
// draws one box per entry.
//   name     - the key sent to the backend (must match the API)
//   label    - the text shown above the box
//   type     - the kind of box: 'password', 'email', 'date' (default: text)
//   options  - turns the box into a dropdown
//   required - the browser will not submit while this is empty
//   hint     - small help text under the box
//
// profiles  = the list from GET /api/user-accounts/profiles, for the dropdown
// isUpdate  = true on the Update page: the password becomes optional there
export function accountFields(profiles, isUpdate = false) {
  return [
    { name: 'username', label: 'User ID', required: true, hint: '3 to 64 letters, numbers, dots, underscores or hyphens.' },
    {
      name: 'password',
      label: isUpdate ? 'New password' : 'Password',
      type: 'password',
      required: !isUpdate,
      hint: isUpdate ? 'Leave blank to keep the current password.' : 'At least 12 characters.',
    },
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    {
      name: 'profileId',
      label: 'User profile',
      required: true,
      // .map turns each profile { id, name } into a dropdown choice { value, label }.
      // String(...) because dropdown values are always text.
      options: profiles.map((profile) => ({ value: String(profile.id), label: profile.name })),
    },
    { name: 'dob', label: 'Date of birth', type: 'date' },
  ];
}

// Turns the form's values into what the backend expects.
// - Empty optional fields are left out (so Update does not change them).
// - The password is only sent if one was typed.
export function toRequestBody(values) {
  const body = {
    username: values.username,
    name: values.name,
    email: values.email,
    profileId: Number(values.profileId), // the dropdown gives text; the API wants a number
  };
  if (values.password) body.password = values.password;
  if (values.dob) body.dob = values.dob;
  return body;
}
