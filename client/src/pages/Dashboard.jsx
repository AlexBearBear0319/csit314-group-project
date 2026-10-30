// Dashboard — the home page each role lands on after login.
// No user story defines dashboard data, so this page only links to the
// role's features (from MENUS in layout/menus.js) and shows records that the
// existing APIs already return. It adds no backend code.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import { MENUS } from '../layout/menus';

// One page heading per role, shown in the hero at the top.
const HEADINGS = {
  'User Admin': 'User administration',
  'Interior Designer': 'Your design studio',
  Customer: 'Find interior design ideas',
  'Platform Manager': 'Platform management',
};

// One short line per shortcut card, keyed by the link's path.
const CARD_TEXT = {
  '/admin/accounts': 'Create, view, update, suspend and search user accounts.',
  '/admin/profiles': 'Manage the user profiles that set each account’s role.',
  '/designer/company': 'Keep your company information up to date.',
  '/designer/current-idps': 'Add and manage the projects you are working on now.',
  '/designer/past-idps': 'Show your finished projects to customers.',
  '/customer/search': 'Browse interior design projects by keyword.',
  '/customer/shortlist': 'See the projects you have saved.',
  '/manager/categories': 'Create and manage IDP categories.',
  '/manager/reports': 'Generate daily, weekly and monthly reports.',
};

export default function Dashboard({ role }) {
  const navigate = useNavigate();
  const cards = (MENUS[role] || []).filter((link) => CARD_TEXT[link.to]);

  return (
    <div className="grid min-w-0 gap-8">
      <section className="rounded-panel border border-border bg-action-soft px-6 py-10 shadow-card sm:px-10 sm:py-14">
        <h1 className="max-w-2xl font-display text-4xl tracking-tight text-ink sm:text-5xl">{HEADINGS[role] || `${role} Dashboard`}</h1>
        {/* Customer: search straight from the home page. The Search IDPs
            page reads ?keyword= once Browse IDP (#32) is built. */}
        {role === 'Customer' && (
          <div className="mt-6 max-w-2xl">
            <SearchBar placeholder="Search interior design projects"
              onSearch={(keyword) => navigate(`/customer/search${keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : ''}`)} />
          </div>
        )}
      </section>

      {role === 'Interior Designer' && <RecentProjects />}

      <section aria-labelledby="dashboard-shortcuts" className="grid gap-4">
        <h2 id="dashboard-shortcuts" className="font-display text-3xl text-ink">Shortcuts</h2>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.to} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
              <h3 className="font-display text-2xl text-ink">{card.label}</h3>
              <p className="flex-1 text-sm text-muted">{CARD_TEXT[card.to]}</p>
              <div>
                <Button type="button" variant="secondary" onClick={() => navigate(card.to)}>Open {card.label}</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// The first three current IDPs from the existing list API. The API only
// accepts its fixed page size, so load page 1 and keep three.
function RecentProjects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/designer/current-idps?page=1', { signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setProjects((response.projects || []).slice(0, 3)); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message || 'Projects could not be loaded.'); });
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="dashboard-projects" aria-busy={projects === null && !error} className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="dashboard-projects" className="font-display text-3xl text-ink">Current projects</h2>
        <Link to="/designer/current-idps" className="text-sm font-medium text-action underline-offset-4 hover:underline">View all current IDPs</Link>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {projects === null && !error && <p className="text-sm text-muted">Loading projects…</p>}
      {projects?.length === 0 && <p className="text-sm text-muted">No current projects yet.</p>}
      {projects?.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const cover = (project.images || []).find((image) => image.url);
            return (
              <li key={project.id}>
                <Link to="/designer/current-idps"
                  className="group block overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow hover:shadow-menu motion-reduce:transition-none">
                  <div className="aspect-[1.35/1] bg-surface-hover">
                    {cover && <img src={cover.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="grid gap-1 p-4">
                    <h3 className="break-words font-display text-2xl text-ink">{project.name}</h3>
                    <p className="text-sm text-muted">
                      {[project.propertyType, project.designStyle].filter(Boolean).join(' · ') || 'No details yet'}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
