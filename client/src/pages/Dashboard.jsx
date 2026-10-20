// Dashboard — the home page each role lands on after login.
import { Navigate } from 'react-router-dom';
import { getUser } from '../session';

export default function Dashboard({ role }) {
  const user = getUser();
  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return (
    <h1 className="text-4xl tracking-tight text-ink sm:text-5xl">{role} Dashboard</h1>
  );
}
