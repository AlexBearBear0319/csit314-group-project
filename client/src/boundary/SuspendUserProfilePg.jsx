// =============================================================================
// BOUNDARY: SuspendUserProfilePg                    (BCE: Boundary layer)
// User story #4: As a User Admin, I want to suspend a user profile so that
// users of that type can no longer log in.
//
// What this page does (the steps of our sequence diagram):
//   1. loads the profile (GET /api/user-profiles/:id) and shows its name and status
//   2. the admin taps "Suspend profile" and a pop-up asks them to confirm
//   3. suspendProfile()         sends the request to SuspendUserProfileC
//                               (POST /api/user-profiles/:id/suspend)
//   4. displaySuccess()         suspended: open the profile page
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ConfirmAction from '../components/ConfirmAction';
import { ProfilePanel, ProfileLoadState } from './userProfileShared';
import { useUserProfile } from './userProfileData';

export default function SuspendUserProfilePg() {
  const { id, profile, error, loading, retry } = useUserProfile();
  const navigate = useNavigate();
  const { search } = useLocation();
  function displaySuccess() {
    navigate(`/admin/profiles/${id}${search}`, { replace: true, state: { message: 'User profile suspended.' } });
  }
  async function suspendProfile() {
    await api.post(`/user-profiles/${id}/suspend`);
    displaySuccess();
  }
  return <ProfilePanel title="Suspend User Profile">
    <ProfileLoadState loading={loading} error={error} onRetry={retry} />
    {profile && <>
      <p className="break-words text-ink">{profile.name} - {profile.status}</p>
      <ConfirmAction title="Suspend user profile?" label="Suspend profile"
        disabled={profile.status === 'suspended'}
        description={`Suspend "${profile.name}"? Accounts with this profile will be unable to log in.`}
        onConfirm={suspendProfile} />
    </>}
  </ProfilePanel>;
}
