// Dashboard — the home page for User Admin, Customer and Platform Manager.
// (Interior Designer has its own page: DesignerDashboard.jsx.)
// No user story defines dashboard data, so this page only links to the
// role's features (from MENUS in layout/menus.js). It adds no backend code.
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import { MENUS } from '../layout/menus';

// One page heading per role, shown in the hero at the top.
const HEADINGS = {
  'User Admin': 'User administration',
  Customer: 'Find interior design ideas',
  'Platform Manager': 'Platform management',
};

// One short line per shortcut card, keyed by the link's path.
const CARD_TEXT = {
  '/admin/accounts': 'Create, view, update, suspend and search user accounts.',
  '/admin/profiles': 'Manage the user profiles that set each account’s role.',
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
