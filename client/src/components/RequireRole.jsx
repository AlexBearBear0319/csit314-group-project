import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { hydrateSession, useSession } from '../session';
import Button from './Button';

function SessionUnavailable() {
  return (
    <section className="mx-auto max-w-lg rounded-panel border border-border bg-surface p-6 shadow-card" role="alert">
      <h1 className="text-2xl text-ink">Cannot reach the sign-in service</h1>
      <p className="mt-3 text-sm text-muted">Check the connection and try again.</p>
      <Button className="mt-5" variant="secondary" onClick={hydrateSession}>Try again</Button>
      <Link className="ml-4 text-sm text-action underline" to="/login">Go to login</Link>
    </section>
  );
}

export default function RequireRole({ role }) {
  const { user, status } = useSession();
  const location = useLocation();

  if (status === 'checking') return <p role="status">Checking your sign-in.</p>;
  if (status === 'unavailable') return <SessionUnavailable />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
