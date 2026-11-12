// =============================================================================
// BOUNDARY: CreateUserProfilePg           (BCE: Boundary layer)
// User story #1: As a User Admin, I want to create a user profile so that I can
// define a type of user on the platform.
//
// What this page does (the steps of our sequence diagram for #1):
//   1. shows the form (a profile name and a description)
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. createProfile(values)     sends { name, description } to CreateUserProfileC
//                                (POST /api/user-profiles)
//   4. displaySuccess(profile)   saved: open the new profile
//      displayError(failure)     something is wrong: show the message
// =============================================================================

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { ProfilePanel } from './userProfileShared';
import { PROFILE_FIELDS, validateProfileInput } from './userProfileData';

export default function CreateUserProfilePg() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); // red message at the top
  const [errors, setErrors] = useState({}); // messages under each box

  // Step 4: the profile was saved.
  function displaySuccess(profile) {
    navigate(`/admin/profiles/${profile.id}${search}`, { replace: true, state: { message: 'User profile created.' } });
  }

  // Step 4: show what went wrong (from validateInput or from the server).
  function displayError(failure) {
    setError(failure.message);
    setErrors(failure.errors || {});
  }

  // Step 2: check the boxes. Returns true if everything is fine.
  function validateInput(values) {
    const problems = validateProfileInput(values);
    if (Object.keys(problems).length) {
      displayError({ message: 'Check the profile details.', errors: problems });
      return false;
    }
    return true;
  }

  // Step 3: send the form to the controller.
  async function createProfile(values) {
    if (saving) return;
    setError('');
    setErrors({});
    if (!validateInput(values)) return;

    setSaving(true);
    try {
      displaySuccess(await api.post('/user-profiles', values));
    } catch (failure) {
      displayError(failure);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfilePanel title="Create User Profile">
      <Message type="error" text={error} />
      <FormFields fields={PROFILE_FIELDS} initial={{ name: '', description: '' }}
        submitLabel="Create profile" onSubmit={createProfile} errors={errors} isSubmitting={saving} />
    </ProfilePanel>
  );
}
