// Layout.jsx — the shared frame around EVERY page:
// header, role-based menu, logout button, and the page content in the middle.
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { getUser, killSession } from '../session';

// Menu links per role. Add a link here when you build a new page.
const MENUS = {
  'User Admin': [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/accounts', label: 'User Accounts' },
    { to: '/admin/profiles', label: 'User Profiles' },
  ],
  'Interior Designer': [
    { to: '/designer', label: 'Dashboard' },
    { to: '/designer/company', label: 'Company Info' },
    { to: '/designer/current-idps', label: 'Current IDPs' },
    { to: '/designer/past-idps', label: 'Past IDPs' },
  ],
  Customer: [
    { to: '/customer', label: 'Dashboard' },
    { to: '/customer/search', label: 'Search IDPs' },
    { to: '/customer/shortlist', label: 'My Shortlist' },
  ],
  'Platform Manager': [
    { to: '/manager', label: 'Dashboard' },
    { to: '/manager/categories', label: 'IDP Categories' },
    { to: '/manager/reports', label: 'Reports' },
  ],
};

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();
  const links = user ? MENUS[user.role] || [] : [];

  // LogoutPg behaviour: logout() -> killSession() -> back to login page
  function logout() {
    killSession();
    navigate('/login');
  }

  return (
    <>
      <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
        <span className="navbar-brand">Interior Design Platform</span>
        <ul className="navbar-nav me-auto">
          {links.map((l) => (
            <li className="nav-item" key={l.to}>
              <Link className="nav-link" to={l.to}>{l.label}</Link>
            </li>
          ))}
        </ul>
        {user && (
          <div className="d-flex align-items-center gap-3">
            <span className="text-light small">{user.name} ({user.role})</span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
          </div>
        )}
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
