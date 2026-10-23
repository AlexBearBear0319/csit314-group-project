import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homeForRole, useSession } from '../session';

export default function RequireRole({ role }) {
  const { user, ready } = useSession();
  const location = useLocation();

  if (!ready) return <p role="status">Checking your sign-in.</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}
