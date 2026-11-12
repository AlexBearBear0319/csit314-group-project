// BCE: Boundary (shared UI component).
// Applies the shared role guard with the User Admin role.

// =============================================================================
// COMPONENT: UserAdminRoute
// Shows its pages only to a logged-in User Admin (a short way to write RequireRole).
// =============================================================================

import RequireRole from './RequireRole';

export default function UserAdminRoute() {
  return <RequireRole role="User Admin" />;
}
