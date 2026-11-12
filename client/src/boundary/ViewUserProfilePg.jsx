// =============================================================================
// BOUNDARY: ViewUserProfilePg                       (BCE: Boundary layer)
// User story #2: As a User Admin, I want to view a user profile so that I can
// check its details.
//
// It also has the buttons for Update (#3) and Suspend (#4). For a suspended
// profile it shows "Activate profile" instead, the alternative flow of #4.
//
// What this page does (the steps of our sequence diagram):
//   1. useUserProfile() loads the profile (GET /api/user-profiles/:id) from
//      ViewUserProfileC
//   2. shows the details and the buttons, or the load error
//   3. activateProfile()        POST /api/user-profiles/:id/activate, then reloads
// =============================================================================

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
