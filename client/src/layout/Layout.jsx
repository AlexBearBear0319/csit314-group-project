// Layout.jsx — the shared frame around EVERY page:
// header, role-based menu, logout button, and the page content in the middle.
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { hydrateSession, killSession, useSession } from '../session';
import Button from '../components/Button';
import Message from '../components/Message';

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
    { to: '/designer/current-idps', label: 'Current projects' },
    { to: '/designer/past-idps', label: 'Past projects' },
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
  const { user } = useSession();
  const navigate = useNavigate();
  const menuButtonRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const links = user ? MENUS[user.role] || [] : [];

  useEffect(() => {
    hydrateSession();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') hydrateSession();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    function closeOnHistoryNavigation() {
      setMenuOpen(false);
    }

    window.addEventListener('popstate', closeOnHistoryNavigation);
    return () => window.removeEventListener('popstate', closeOnHistoryNavigation);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  // LogoutPg behaviour: logout() -> killSession() -> back to login page
  async function logout() {
    setLogoutError('');
    try {
      await killSession();
      navigate('/login');
    } catch {
      setLogoutError('The server could not end this session. Check your connection and try again.');
    }
  }

  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <a
        className="sr-only fixed left-3 top-3 z-50 rounded-control bg-surface px-4 py-3 text-sm font-medium text-ink focus:not-sr-only focus:outline-action"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <svg className="size-8 text-action" viewBox="0 0 36 44" fill="none" aria-hidden="true">
              <path d="M4 41V18a14 14 0 0 1 28 0v23ZM18 4v37M4 25h28M4 41h28" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="truncate font-display text-lg leading-tight sm:text-xl">Interior Design Platform</span>
          </div>

          {links.length > 0 && (
            <button
              ref={menuButtonRef}
              className="inline-flex size-11 items-center justify-center rounded-control border border-border bg-surface text-ink hover:bg-surface-hover focus-visible:outline-action lg:hidden"
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )}

          <nav
            id="primary-navigation"
            aria-label="Main navigation"
            className={`${menuOpen ? 'flex' : 'hidden'} absolute left-4 right-4 top-full z-20 flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-menu lg:static lg:col-start-2 lg:row-start-1 lg:flex lg:flex-row lg:items-center lg:justify-center lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.label === 'Dashboard'}
                className={({ isActive }) => `block rounded-control px-3 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none lg:whitespace-nowrap ${
                  isActive
                    ? 'bg-action-soft text-action-ink'
                    : 'text-muted hover:bg-surface-hover hover:text-ink lg:hover:bg-transparent lg:hover:text-action'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {user && (
            <div className="col-span-2 flex min-w-0 justify-end lg:col-span-1 lg:col-start-3 lg:row-start-1">
              <details className="group relative">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-border bg-surface px-2 py-1.5 hover:bg-surface-hover focus-visible:outline-action [&::-webkit-details-marker]:hidden">
                  <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-action-soft text-xs font-semibold text-action-ink" aria-hidden="true">
                    <span>{initials}</span>
                    {user.photo && <img src={user.photo} alt="" className="absolute size-8 rounded-full object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
                  </span>
                  <span className="max-w-32 truncate text-sm font-medium text-ink">{user.name}</span>
                  <span className="text-xs text-muted" aria-hidden="true">⌄</span>
                </summary>
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-card border border-border bg-surface p-4 shadow-menu" role="region" aria-label="Account details">
                  <p className="truncate font-medium text-ink">{user.name}</p>
                  <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
                  <p className="mt-3 text-xs text-muted">Role</p>
                  <p className="text-sm font-medium text-ink">{user.role}</p>
                  <Button className="mt-4 w-full" variant="secondary" size="sm" onClick={logout}>Logout</Button>
                </div>
              </details>
            </div>
          )}
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-8 lg:py-12"
      >
        <Message type="error" text={logoutError} />
        <Outlet />
      </main>
    </div>
  );
}
