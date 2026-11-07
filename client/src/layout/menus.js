// =============================================================================
// DATA: menus.js
// WHAT IT HOLDS: the menu links for each of the 4 roles. There are no functions
// in this file, only a list.
// WHO USES IT: Layout.jsx draws the header menu from this, and Dashboard.jsx
// draws its shortcut cards from it. Add a link here when you build a new page.
//
// HOW TO READ ONE LINE:
//   { to: '/admin/accounts', label: 'User Accounts' }
//   to    = the page address that the link opens
//   label = the words the user sees on the link
// =============================================================================

// "export" lets other files load this list. MENUS maps a role to its links.
export const MENUS = {
  // ---- Links for the User Admin role ----------------------------------------
  'User Admin': [
    { to: '/admin', label: 'Dashboard' }, // the User Admin home page
    { to: '/admin/accounts', label: 'User Accounts' }, // manage accounts
    { to: '/admin/profiles', label: 'User Profiles' }, // manage profiles
  ],
  // ---- Links for the Interior Designer role ---------------------------------
  'Interior Designer': [
    { to: '/designer', label: 'Dashboard' }, // the designer home page
    { to: '/designer/company', label: 'Company Info' }, // company details
    { to: '/designer/current-idps', label: 'Current projects' }, // projects in progress
    { to: '/designer/past-idps', label: 'Past projects' }, // finished projects
  ],
  // ---- Links for the Customer role ------------------------------------------
  Customer: [
    { to: '/customer', label: 'Dashboard' }, // the customer home page
    { to: '/customer/search', label: 'Search IDPs' }, // find projects
    { to: '/customer/shortlist', label: 'My Shortlist' }, // saved projects
  ],
  // ---- Links for the Platform Manager role ----------------------------------
  'Platform Manager': [
    { to: '/manager', label: 'Dashboard' }, // the manager home page
    { to: '/manager/categories', label: 'IDP Categories' }, // manage categories
    { to: '/manager/reports', label: 'Reports' }, // daily, weekly and monthly reports
  ],
};
