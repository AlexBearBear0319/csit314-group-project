// BCE: Boundary.
// Defines the record endpoint and exposes shared loading behavior for this feature.

// =============================================================================
// BOUNDARY HELPER: userProfileData
// Shared by the user profile pages (stories #1-5).
//   PROFILE_FIELDS         the boxes of the Create and Update forms
//   validateProfileInput   the input check of the Create and Update forms
//   useUserProfile         loads one profile (by the :id in the address)
// =============================================================================

import useRecord from '../hooks/useRecord';
import { checkOptionalText, checkRequiredText, onlyProblems } from './inputRules';

export const PROFILE_FIELDS = [
  { name: 'name', label: 'Profile name', required: true, maxLength: 255 },
  { name: 'description', label: 'Description', type: 'textarea', maxLength: 255 },
];

// Returns { name: 'message', ... } with only the wrong boxes.
export function validateProfileInput(values) {
  return onlyProblems({
    name: checkRequiredText(values.name, { label: 'profile name', max: 255 }),
    description: checkOptionalText(values.description, { max: 255 }),
  });
}

// Loads the profile with GET /api/user-profiles/:id.
export function useUserProfile() {
  const { record, ...state } = useRecord('/user-profiles');
  return { ...state, profile: record };
}
