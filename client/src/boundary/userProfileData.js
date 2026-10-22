import useRecord from '../hooks/useRecord';

export const PROFILE_FIELDS = [
  { name: 'name', label: 'Profile name', required: true, maxLength: 255 },
  { name: 'description', label: 'Description', type: 'textarea', maxLength: 255 },
];

export function useUserProfile() {
  const { record, ...state } = useRecord('/user-profiles');
  return { ...state, profile: record };
}
