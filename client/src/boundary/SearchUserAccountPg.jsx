// =============================================================================
// BOUNDARY: SearchUserAccountPg  (user story #10: User Admin searches user accounts)
// Methods from the design: searchAccounts(), displaySuccess(), displayError()
//
// Address: /admin/accounts  ("User Accounts" in the User Admin menu)
// This is the main User Accounts page. It shows:
//   - a search bar                         (#10)
//   - a table of accounts                  (#10)
//   - a "Create account" button            -> CreateUserAccountPg (#6)
//   - View / Edit on each row              -> #7, #8
//   - Suspend on active rows               -> #9
//   - Reactivate on suspended rows         -> #8 (alternative flow: status back to active)
//
// Flow: page opens or Search clicked -> GET /api/user-accounts?keyword=...
//   -> SearchUserAccountC -> UserAccount entity -> list comes back -> table updates
//
// HOW A REACT PAGE WORKS (applies to every page):
// - The page is a function. React calls it to "draw" the page, and calls it
//   AGAIN every time a piece of state changes. That is a "redraw".
// - useState(...) creates a piece of memory that survives redraws.
//   const [value, setValue] = useState(start): value is the current value,
//   setValue(new) changes it AND triggers a redraw.
// - The function returns JSX: HTML-like markup that says what to show.
//   Inside JSX, { ... } runs JavaScript, e.g. {success} shows its value.
// =============================================================================

// ---- Imports: tools this page uses ------------------------------------------
// React hooks (special functions whose names start with "use"):
//   useState    - memory that survives redraws (see above)
//   useEffect   - run code AFTER the page draws, e.g. load data from the backend
//   useCallback - keep the same function between redraws (explained below)
import { useCallback, useEffect, useState } from 'react';
// React Router (moving between pages without reloading the browser):
//   useNavigate - gives navigate('/some/address') to go to another page
//   useLocation - tells us about the current page, including messages
//                 that the previous page passed along
import { useLocation, useNavigate } from 'react-router-dom';
// api - Alex's helper for calling the backend. It adds the login cookie and
// the CSRF token, and turns error replies into an error with .message.
import { api } from '../api';
// Shared components (reusable pieces of page that the team already built):
import Button from '../components/Button'; // a styled button
import Message from '../components/Message'; // a green success / red error box
import ResultsTable from '../components/ResultsTable'; // a table with action buttons per row
import SearchBar from '../components/SearchBar'; // a search box + Search button
// Our own files:
import SuspendUserAccountPg from './SuspendUserAccountPg'; // the "Suspend this account?" pop-up (#9)
import { statusLabel } from './userAccountShared'; // turns 'active' into 'Active'

// The table's columns. key = the field in each account, label = the heading.
// It is outside the function because it never changes, so it does not need
// to be rebuilt on every redraw.
const COLUMNS = [
  { key: 'username', label: 'User ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'profileName', label: 'User profile' },
  { key: 'status', label: 'Status' },
];

// "export default" makes this the main thing this file gives to others.
// App.jsx imports it and shows it at /admin/accounts.
export default function SearchUserAccountPg() {
  // navigate(address) moves to another page.
  const navigate = useNavigate();

  // location.state carries a message from another page. For example, a page
  // can do navigate('/admin/accounts', { state: { message: 'Done.' } }).
  const location = useLocation();

  // ---- State: what this page remembers ----------------------------------------
  const [accounts, setAccounts] = useState([]); // the accounts in the table; [] = empty list at first
  const [keyword, setKeyword] = useState(''); // the current search text; '' = show everyone
  const [refreshKey, setRefreshKey] = useState(0); // a counter; changing it reloads the list
  const [loading, setLoading] = useState(true); // true while waiting for the backend
  const [error, setError] = useState(''); // red message; '' = no message shown
  // Green message. ?. means "if location.state exists, read .message, else
  // undefined", and || '' turns undefined into ''.
  const [success, setSuccess] = useState(location.state?.message || '');
  const [suspendTarget, setSuspendTarget] = useState(null); // the account in the Suspend pop-up; null = pop-up closed

  // ---- displaySuccess / displayError (names from Mr Chew's design) ------------
  // useCallback(fn, []) gives back the SAME function on every redraw.
  // Without it, a new function would be made each redraw, and the useEffect
  // below (which lists these functions in its [...]) would think something
  // changed and reload the list forever. [] = nothing it depends on changes.
  const displaySuccess = useCallback((list) => {
    setAccounts(list); // put the accounts in the table
    setLoading(false); // hide "Loading accounts..."
  }, []);

  const displayError = useCallback((message) => {
    // || gives a fallback message if the backend did not send one.
    setError(message || 'The accounts could not be loaded. Try again.');
    setLoading(false);
  }, []);

  // ---- Loading the list from the backend ----------------------------------------
  // useEffect(code, [a, b]) runs the code after the page draws, and runs it
  // again whenever a or b changes. Here: when the page opens, and whenever
  // keyword or refreshKey changes.
  useEffect(() => {
    // "active" stops an old, slow reply from overwriting a newer one. When the
    // effect reruns (e.g. a new search), React first calls the cleanup function
    // returned at the bottom, which sets the old run's active to false.
    let active = true;

    // Ask the backend. encodeURIComponent makes the text safe inside a URL:
    // a space, @ or & in the search would otherwise break the address.
    api.get(`/user-accounts?keyword=${encodeURIComponent(keyword)}`)
      // .then runs when the reply arrives successfully; list = the accounts.
      .then((list) => { if (active) displaySuccess(list); })
      // .catch runs if the request fails; err.message = the backend's message.
      .catch((err) => { if (active) displayError(err.message); });

    // The cleanup function (see "active" above).
    return () => { active = false; };
  }, [keyword, refreshKey, displaySuccess, displayError]);

  // ---- searchAccounts: runs when Search is clicked --------------------------------
  // It does not call the backend itself. It changes keyword, and the useEffect
  // above notices and does the loading. refreshKey changes too, so searching
  // the same word twice still reloads.
  function searchAccounts(text) {
    setLoading(true); // show "Loading accounts..."
    setError(''); // clear any old error
    setKeyword(text); // remember the new search text
    // (key) => key + 1 means "take the current value and add 1". This form is
    // safer than setRefreshKey(refreshKey + 1) when changes happen quickly.
    setRefreshKey((key) => key + 1);
  }

  // ---- afterSuspend: the Suspend pop-up calls this when it succeeds ---------------
  // updated = the account the backend sent back, now with status 'suspended'.
  function afterSuspend(updated) {
    setSuspendTarget(null); // close the pop-up
    // `...${x}...` is a template string: it puts the value of x into the text.
    setSuccess(`${updated.name}'s account is suspended.`);
    setRefreshKey((key) => key + 1); // reload the list so the status updates
  }

  // ---- reactivateAccount: Reactivate clicked on a suspended row (#8, alternative flow) ----
  // PUT /api/user-accounts/5 with { status: 'active' } -> UpdateUserAccountC.
  // No confirm pop-up: reactivating is easy to undo (just suspend again).
  async function reactivateAccount(row) {
    setError(''); // clear old messages
    setSuccess('');
    try {
      const updated = await api.put(`/user-accounts/${row.id}`, { status: 'active' });
      setSuccess(`${updated.name}'s account is reactivated. They can log in again.`);
      setRefreshKey((key) => key + 1); // reload the list so the status updates
    } catch (err) {
      setError(err.message || 'The account could not be reactivated. Try again.');
    }
  }

  // ---- Data for the table -----------------------------------------------------------
  // ResultsTable shows row[column.key] as plain text, so build display rows:
  // the same accounts with the status turned into 'Active' / 'Suspended'.
  // .map runs the arrow function once per account and collects the results.
  // { ...account, status: ..., rawStatus: ... } copies the account, replaces
  // status with the display text, and keeps the original value as rawStatus
  // so the buttons below can check it. rawStatus is not a column, so it is
  // never shown in the table.
  const rows = accounts.map((account) => ({
    ...account,
    status: statusLabel(account.status),
    rawStatus: account.status,
  }));

  // The buttons on each row. ResultsTable draws one button per entry and calls
  // its onClick with that row when clicked.
  //   label   - the button text
  //   variant - the button style ('outline-danger' = red outline)
  //   show    - optional: only show the button on rows where this returns true
  const actions = [
    // View (#7): go to /admin/accounts/5 for the account with id 5.
    { label: 'View', onClick: (row) => navigate(`/admin/accounts/${row.id}`) },
    // Edit (#8): go to /admin/accounts/5/edit.
    { label: 'Edit', onClick: (row) => navigate(`/admin/accounts/${row.id}/edit`) },
    {
      // Suspend (#9): only on active accounts. Opens the pop-up.
      label: 'Suspend',
      variant: 'outline-danger',
      show: (row) => row.rawStatus === 'active',
      // .find looks through the original list for the account with the same
      // id, to give the pop-up the account exactly as the backend sent it.
      // (Suspending your own account is refused by the backend, and its
      // message shows inside the pop-up.)
      onClick: (row) => setSuspendTarget(accounts.find((item) => item.id === row.id)),
    },
    {
      // Reactivate (#8, alternative flow): only on suspended accounts.
      label: 'Reactivate',
      variant: 'outline-primary',
      show: (row) => row.rawStatus === 'suspended',
      onClick: reactivateAccount,
    },
  ];

  // ---- What the page shows (JSX) ------------------------------------------------------
  // className="..." holds Tailwind styles: each word is one style, e.g.
  // "grid gap-6" = stack the children with space between them. Change them
  // only to match UI_GUIDELINES.md.
  return (
    // <section> wraps the whole page content.
    <section className="grid gap-6">
      {/* Top row: page heading on the left, Create button on the right.
          "flex ... justify-between" puts them at opposite ends. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">User accounts</h1>
        {/* () => navigate(...) is a function that runs on click. Writing
            onClick={navigate(...)} without "() =>" would run it immediately. */}
        <Button onClick={() => navigate('/admin/accounts/new')}>Create account</Button>
      </div>

      {/* Message boxes. Each one shows nothing when its text is ''. */}
      <Message type="success" text={success} />
      <Message type="error" text={error} />

      {/* Search box. When Search is clicked, SearchBar calls searchAccounts
          with the typed text. */}
      <SearchBar placeholder="Search by user ID, name or email" onSearch={searchAccounts} />

      {/* a ? b : c in JSX: while loading, show the status line; otherwise
          show the table. role="status" lets screen readers announce it. */}
      {loading
        ? <p role="status" className="text-muted">Loading accounts...</p>
        : <ResultsTable columns={COLUMNS} rows={rows} actions={actions} ariaLabel="User accounts" />}

      {/* The Suspend pop-up. It is always on the page but only opens when
          suspendTarget is an account (see SuspendUserAccountPg.jsx). */}
      <SuspendUserAccountPg
        account={suspendTarget}
        onDone={afterSuspend}
        onCancel={() => setSuspendTarget(null)}
      />
    </section>
  );
}
