// =============================================================================
// BOUNDARY: ManagePastIdpsPg            (BCE: Boundary layer)
// User stories #25-29: an Interior Designer creates, views, updates, deletes and
// searches their past (finished) projects.
// The page itself is DesignerIdpsPage. We only tell it which status to use.
// =============================================================================

import DesignerIdpsPage from './DesignerIdpsPage';

export default function ManagePastIdpsPg() {
  return <DesignerIdpsPage status="past" />;
}
