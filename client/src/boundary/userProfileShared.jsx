// BCE: Boundary.
// Provides feature-specific wrappers around the shared record UI and loading states.

// =============================================================================
// BOUNDARY HELPER: userProfileShared
// The shared page frame (title + back link) and load message of the user profile
// pages (#1-5).
// =============================================================================

import RecordPanel, { RecordLoadState } from '../components/RecordPanel';

export function ProfilePanel({ title, children }) {
  // Render the page layout and connect its controls to the state and handlers above.
  return (
    <RecordPanel title={title} listPath="/admin/profiles" backLabel="Back to user profiles">
      {children}
    </RecordPanel>
  );
}

export function ProfileLoadState(props) {
  return <RecordLoadState {...props} />;
}
