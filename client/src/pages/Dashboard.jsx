// =============================================================================
// PAGE: Dashboard
// WHAT IT DOES: the home page a role lands on after login. It shows a large
// heading panel (the "hero") and one shortcut card for each feature of that role.
//
// WHO SEES IT: User Admin, Customer and Platform Manager. The Interior Designer
// has a separate page (DesignerDashboard.jsx), so App.jsx does not send designers
// here. The designer parts of this file do not run at the moment.
//
// No user story defines dashboard data, so this page only links to the
// role's features (from MENUS in layout/menus.js) and shows records that the
// existing APIs already return. It adds no backend code.
//
// (How React pages work is explained at the top of
// boundary/SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports: tools this page uses ------------------------------------------
// useEffect = run code after the page draws. useState = memory that survives redraws.
import { useEffect, useState } from 'react';
// Link = a clickable link to another page. useNavigate = change page from code.
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api'; // calls the backend
import Button from '../components/Button'; // a styled button
import SearchBar from '../components/SearchBar'; // a search box + Search button
import { MENUS } from '../layout/menus'; // the list of links for each role

// One page heading per role, shown in the hero at the top.
const HEADINGS = {
  'User Admin': 'User administration', // heading for the User Admin
  'Interior Designer': 'Your design studio', // heading for the designer
  Customer: 'Find interior design ideas', // heading for the Customer
  'Platform Manager': 'Platform management', // heading for the Platform Manager
};

// One short line per shortcut card, keyed by the link's path.
const CARD_TEXT = {
  '/admin/accounts': 'Create, view, update, suspend and search user accounts.', // User Accounts card
  '/admin/profiles': 'Manage the user profiles that set each account’s role.', // User Profiles card
  '/designer/company': 'Keep your company information up to date.', // Company Info card
  '/designer/current-idps': 'Add and manage the projects you are working on now.', // Current projects card
  '/designer/past-idps': 'Show your finished projects to customers.', // Past projects card
  '/customer/search': 'Browse interior design projects by keyword.', // Search IDPs card
  '/customer/shortlist': 'See the projects you have saved.', // My Shortlist card
  '/manager/categories': 'Create and manage IDP categories.', // IDP Categories card
  '/manager/reports': 'Generate daily, weekly and monthly reports.', // Reports card
};

// =============================================================================
// FUNCTION: Dashboard (the page itself)
// WHAT IT DOES: draws the hero and the shortcut cards for one role.
// RECEIVES: role = the role name, such as 'Customer'. App.jsx passes it in.
// =============================================================================
export default function Dashboard({ role }) {
  // navigate('/address') moves to another page.
  const navigate = useNavigate();
  // Get this role's links and keep only those that have card text. This leaves
  // out the "Dashboard" link, because the user is already on that page.
  const cards = (MENUS[role] || []).filter((link) => CARD_TEXT[link.to]);

  // Everything inside return ( ... ) is what appears on the screen.
  return (
    // The outer box. It stacks the sections with space between them.
    <div className="grid min-w-0 gap-8">
      {/* ---- The hero: the large panel at the top of the page ---- */}
      <section className="rounded-panel border border-border bg-action-soft px-6 py-10 shadow-card sm:px-10 sm:py-14">
        {/* The page heading. If the role has no heading, it shows "<role> Dashboard". */}
        <h1 className="max-w-2xl font-display text-4xl tracking-tight text-ink sm:text-5xl">{HEADINGS[role] || `${role} Dashboard`}</h1>
        {/* Customer: search straight from the home page. The Search IDPs
            page reads ?keyword= once Browse IDP (#32) is built. */}
        {role === 'Customer' && (
          <div className="mt-6 max-w-2xl">
            {/* When Search is clicked, go to the search page with the typed text
                in the address. trim() removes spaces at the ends, and
                encodeURIComponent makes the text safe inside a web address. */}
            <SearchBar placeholder="Search interior design projects"
              onSearch={(keyword) => navigate(`/customer/search${keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : ''}`)} />
          </div>
        )}
      </section>

      {/* Show the recent projects only for the designer role. */}
      {role === 'Interior Designer' && <RecentProjects />}

      {/* ---- The shortcut cards ---- */}
      <section aria-labelledby="dashboard-shortcuts" className="grid gap-4">
        <h2 id="dashboard-shortcuts" className="font-display text-3xl text-ink">Shortcuts</h2>
        {/* The grid: 1 card per row on a phone, 2 on a tablet, 3 on a wide screen. */}
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* .map draws one card for each link. "key" helps React track each card. */}
          {cards.map((card) => (
            <li key={card.to} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
              {/* The card title, such as "User Accounts". */}
              <h3 className="font-display text-2xl text-ink">{card.label}</h3>
              {/* The one-line description from CARD_TEXT above. */}
              <p className="flex-1 text-sm text-muted">{CARD_TEXT[card.to]}</p>
              <div>
                {/* The button that opens this feature's page. */}
                <Button type="button" variant="secondary" onClick={() => navigate(card.to)}>Open {card.label}</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
} // End of Dashboard.

// =============================================================================
// FUNCTION: RecentProjects
// WHAT IT DOES: shows the first three current IDPs from the existing list API.
// The API only accepts its fixed page size, so load page 1 and keep three.
// NOTE: this does not run at the moment, because designers use DesignerDashboard.jsx.
// =============================================================================
function RecentProjects() {
  // The projects to show. null means they are still loading.
  const [projects, setProjects] = useState(null);
  // The error message. '' means there is no error.
  const [error, setError] = useState('');

  // Load the projects once, when this part of the page first appears.
  useEffect(() => {
    // The controller lets us cancel the request if the user leaves the page.
    const controller = new AbortController();
    // Ask the backend for page 1 of the current projects.
    api.get('/designer/current-idps?page=1', { signal: controller.signal })
      // If it works and was not cancelled, keep the first 3 projects.
      .then((response) => { if (!controller.signal.aborted) setProjects((response.projects || []).slice(0, 3)); })
      // If it fails and was not cancelled, remember the error message.
      .catch((err) => { if (!controller.signal.aborted) setError(err.message || 'Projects could not be loaded.'); });
    // Cleanup: cancel the request when this part of the page goes away.
    return () => controller.abort();
  }, []); // [] means run this only once.

  // What this part of the page shows.
  return (
    <section aria-labelledby="dashboard-projects" aria-busy={projects === null && !error} className="grid gap-4">
      {/* The heading row: the title on the left, "View all" on the right. */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="dashboard-projects" className="font-display text-3xl text-ink">Current projects</h2>
        <Link to="/designer/current-idps" className="text-sm font-medium text-action underline-offset-4 hover:underline">View all current IDPs</Link>
      </div>
      {/* a && b means: show b only when a is true. */}
      {/* Show the error, if there is one. */}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {/* Show a loading line while waiting. */}
      {projects === null && !error && <p className="text-sm text-muted">Loading projects…</p>}
      {/* Show this when the designer has no projects. */}
      {projects?.length === 0 && <p className="text-sm text-muted">No current projects yet.</p>}
      {/* Show the project cards when there is at least one project. */}
      {projects?.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Draw one card for each project. */}
          {projects.map((project) => {
            // Find the first photo that has a web address.
            const cover = (project.images || []).find((image) => image.url);
            // Hand back the card for this project.
            return (
              <li key={project.id}>
                {/* The whole card is a link to the current projects page. */}
                <Link to="/designer/current-idps"
                  className="group block overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow hover:shadow-menu motion-reduce:transition-none">
                  {/* The photo area. It stays plain if the project has no photo. */}
                  <div className="aspect-[1.35/1] bg-surface-hover">
                    {cover && <img src={cover.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  {/* The text under the photo. */}
                  <div className="grid gap-1 p-4">
                    {/* The project name. */}
                    <h3 className="break-words font-display text-2xl text-ink">{project.name}</h3>
                    {/* The property type and design style, joined with a dot. */}
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
} // End of RecentProjects.
