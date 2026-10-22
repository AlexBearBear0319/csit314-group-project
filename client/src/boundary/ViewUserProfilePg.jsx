import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import DetailsView from '../components/DetailsView';
import Message from '../components/Message';
import { ProfilePanel, ProfileLoadState } from './userProfileShared';
import { useUserProfile } from './userProfileData';

export default function ViewUserProfilePg() {
  const { id, profile, error, loading, retry } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <ProfilePanel title="User Profile">
      {!loading && !error && <Message type="success" text={location.state?.message} />}
      <ProfileLoadState loading={loading} error={error} onRetry={retry} />
      {profile && <>
        <DetailsView item={profile} fields={[
          { key: 'name', label: 'Profile name' }, { key: 'description', label: 'Description' },
          { key: 'status', label: 'Status' },
        ]} />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => navigate(`/admin/profiles/${id}/edit${location.search}`)}>Update profile</Button>
          <Button type="button" variant="secondary" disabled={profile.status === 'suspended'}
            onClick={() => navigate(`/admin/profiles/${id}/suspend${location.search}`)}>Suspend profile</Button>
        </div>
      </>}
    </ProfilePanel>
  );
}
