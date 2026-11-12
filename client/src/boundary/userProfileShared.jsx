// =============================================================================
// BOUNDARY HELPER: userProfileShared
// The shared page frame (title + back link) and load message of the user profile
// pages (#1-5).
// =============================================================================

import RecordPanel, { RecordLoadState } from '../components/RecordPanel';

export function ProfilePanel({ title, children }) {
  return (
    <RecordPanel title={title} listPath="/admin/profiles" backLabel="Back to user profiles">
      {children}
    </RecordPanel>
  );
}

export function ProfileLoadState(props) {
  return <RecordLoadState {...props} />;
}
