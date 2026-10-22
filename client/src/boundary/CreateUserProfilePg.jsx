import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { ProfilePanel } from './userProfileShared';
import { PROFILE_FIELDS } from './userProfileData';

export default function CreateUserProfilePg() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  function displaySuccess(profile) {
    navigate(`/admin/profiles/${profile.id}${search}`, { replace: true, state: { message: 'User profile created.' } });
  }
  function displayError(failure) { setError(failure.message); setErrors(failure.errors || {}); }
  async function createProfile(values) {
    if (saving) return;
    setSaving(true); setError(''); setErrors({});
    try { displaySuccess(await api.post('/user-profiles', values)); }
    catch (failure) { displayError(failure); }
    finally { setSaving(false); }
  }
  return (
    <ProfilePanel title="Create User Profile">
      <Message type="error" text={error} />
      <FormFields fields={PROFILE_FIELDS} initial={{ name: '', description: '' }}
        submitLabel="Create profile" onSubmit={createProfile} errors={errors} isSubmitting={saving} />
    </ProfilePanel>
  );
}
