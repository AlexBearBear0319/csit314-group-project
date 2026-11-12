// =============================================================================
// BOUNDARY: UpdateUserProfilePg           (BCE: Boundary layer)
// User story #3: As a User Admin, I want to update a user profile so that its
// details stay accurate.
//
// What this page does (the steps of our sequence diagram for #3):
//   1. useUserProfile() loads the profile (GET /api/user-profiles/:id) and the
//      form opens with its values
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. updateProfile(values)     sends the new values to UpdateUserProfileC
//                                (PUT /api/user-profiles/:id)
//   4. displaySuccess()          saved: go back to the profile
//      displayError(failure)     something is wrong: show the message
// =============================================================================

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { ProfilePanel, ProfileLoadState } from './userProfileShared';
import { PROFILE_FIELDS, useUserProfile, validateProfileInput } from './userProfileData';

export default function UpdateUserProfilePg() {
  const { id, profile, error: loadError, loading, retry } = useUserProfile();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  function displaySuccess() {
    navigate(`/admin/profiles/${id}${search}`, { replace: true, state: { message: 'User profile updated.' } });
  }

  function displayError(failure) {
    setError(failure.message);
    setErrors(failure.errors || {});
  }

  function validateInput(values) {
    const problems = validateProfileInput(values);
    if (Object.keys(problems).length) {
      displayError({ message: 'Check the profile details.', errors: problems });
      return false;
    }
    return true;
  }

  async function updateProfile(values) {
    if (saving) return;
    setError('');
    setErrors({});
    if (!validateInput(values)) return;

    setSaving(true);
    try {
      await api.put(`/user-profiles/${id}`, values);
      displaySuccess();
    } catch (failure) {
      displayError(failure);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfilePanel title="Update User Profile">
      <ProfileLoadState loading={loading} error={loadError} onRetry={retry} />
      <Message type="error" text={error} />
      {profile && <FormFields key={id} fields={PROFILE_FIELDS} initial={profile}
        submitLabel="Save changes" onSubmit={updateProfile} errors={errors} isSubmitting={saving} />}
    </ProfilePanel>
  );
}
