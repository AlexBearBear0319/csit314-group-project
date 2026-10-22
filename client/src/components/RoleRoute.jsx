import { Navigate, Outlet } from 'react-router-dom';
import { getUser } from '../session';

// Navigation guard only. Server authorization belongs to the login integration.
export default function RoleRoute({ role }) {
  return getUser()?.role === role ? <Outlet /> : <Navigate to="/login" replace />;
}
