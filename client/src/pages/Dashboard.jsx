// Dashboard — the home page each role lands on after login.
import { Navigate } from 'react-router-dom';
import { getUser } from '../session';

export default function Dashboard({ role }) {
  const user = getUser();
  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return (
    <>
      <h2>{role} Dashboard</h2>
      <p className="text-muted">Welcome, {user.name}. Use the menu above to get started.</p>
    </>
  );
}
