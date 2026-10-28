import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Button from '../components/Button';
import DetailsView from '../components/DetailsView';
import Message from '../components/Message';
import { ProfilePanel, ProfileLoadState } from './userProfileShared';
import { useUserProfile } from './userProfileData';

export default function ViewUserProfilePg() {
  const { id, profile, error, loading, retry } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [activating, setActivating] = useState(false);
  const [activateMessage, setActivateMessage] = useState({ type: '', text: '' });
  // Alternative flow of #4: no confirm pop-up, activating is easy to undo.
  async function activateProfile() {
    setActivating(true);
    setActivateMessage({ type: '', text: '' });
    try {
      await api.post(`/user-profiles/${id}/activate`);
      setActivateMessage({ type: 'success', text: 'User profile activated. Its accounts can log in again.' });
      retry();
    } catch (err) {
      setActivateMessage({ type: 'error', text: err.message || 'The profile could not be activated. Try again.' });
    } finally {
      setActivating(false);
    }
  }
  return (
    <ProfilePanel title="User Profile">
      {!loading && !error && <Message type="success" text={activateMessage.text ? '' : location.state?.message} />}
      <Message type={activateMessage.type} text={activateMessage.text} />
      <ProfileLoadState loading={loading} error={error} onRetry={retry} />
      {profile && <>
        <DetailsView item={profile} fields={[
          { key: 'name', label: 'Profile name' }, { key: 'description', label: 'Description' },
          { key: 'status', label: 'Status' },
        ]} />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => navigate(`/admin/profiles/${id}/edit${location.search}`)}>Update profile</Button>
          {profile.status === 'suspended'
            ? <Button type="button" variant="secondary" loading={activating} onClick={activateProfile}>Activate profile</Button>
            : <Button type="button" variant="secondary"
              onClick={() => navigate(`/admin/profiles/${id}/suspend${location.search}`)}>Suspend profile</Button>}
        </div>
      </>}
    </ProfilePanel>
  );
}
