import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { ProfilePanel, ProfileLoadState } from './userProfileShared';
import { PROFILE_FIELDS, useUserProfile } from './userProfileData';

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
  function displayError(failure) { setError(failure.message); setErrors(failure.errors || {}); }
  async function updateProfile(values) {
    if (saving) return;
    setSaving(true); setError(''); setErrors({});
    try { await api.put(`/user-profiles/${id}`, values); displaySuccess(); }
    catch (failure) { displayError(failure); }
    finally { setSaving(false); }
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
