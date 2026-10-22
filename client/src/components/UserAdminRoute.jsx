import { Navigate, Outlet } from 'react-router-dom';
import { getUser } from '../session';

export default function UserAdminRoute() {
  const user = getUser();
  return user?.role === 'User Admin' ? <Outlet /> : <Navigate to="/login" replace />;
}
