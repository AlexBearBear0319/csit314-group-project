// Menu links per role. Add a link here when you build a new page.
// Layout.jsx draws the header menu from this, and Dashboard.jsx draws its
// shortcut cards from it.
export const MENUS = {
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
