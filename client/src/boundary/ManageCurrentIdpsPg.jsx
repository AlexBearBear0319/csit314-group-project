// =============================================================================
// BOUNDARY: ManageCurrentIdpsPg            (BCE: Boundary layer)
// User stories #20-24: an Interior Designer creates, views, updates, deletes and
// searches their current (ongoing) projects.
// The page itself is DesignerIdpsPage. We only tell it which status to use.
// =============================================================================

import DesignerIdpsPage from './DesignerIdpsPage';

export default function ManageCurrentIdpsPg() {
  return <DesignerIdpsPage status="current" />;
}
