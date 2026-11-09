// =============================================================================
// PAGE: ProfileHome (/home)
// WHAT IT DOES: the home page for an account whose user profile was created by
// a User Admin (story #1), such as "Senior Designer". These profiles are not one
// of the 4 built-in roles, so they have no role pages yet. The account can log
// in, see this page and log out (the Logout button is in the header).
// The server refuses every role feature for these accounts (requireRole).
// =============================================================================
import { Navigate } from 'react-router-dom';
import { homeForRole, isBuiltInRole, useSession } from '../session';

export default function ProfileHome() {
  const { user, status } = useSession();

  if (status === 'checking') return <p role="status">Checking your sign-in.</p>;
  if (!user) return <Navigate to="/login" replace />;
  // A built-in role has its own home page.
  if (isBuiltInRole(user.role)) return <Navigate to={homeForRole(user.role)} replace />;

  return (
    <section className="rounded-panel border border-border bg-surface p-6 shadow-card sm:p-10">
      <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">{user.role}</h1>
      <p className="mt-4 text-muted">There are no pages for this profile yet.</p>
    </section>
  );
}
