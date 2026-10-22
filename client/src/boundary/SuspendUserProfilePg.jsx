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
