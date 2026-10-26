// =============================================================================
// BOUNDARY: ViewUserAccountPg  (user story #7: User Admin views a user account)
// Methods from the design: viewAccount(), displaySuccess(), displayError()
//
// Address: /admin/accounts/:id   e.g. /admin/accounts/5
//
// Flow: page opens -> GET /api/user-accounts/5
//   -> ViewUserAccountC -> UserAccount entity -> account comes back -> details shown
// Also has Edit (-> UpdateUserAccountPg) and Suspend (-> SuspendUserAccountPg).
// For a suspended account it shows Reactivate instead of Suspend. Reactivating
// is an alternative flow of Update (#8): PUT /api/user-accounts/5 with
// { status: 'active' } -> UpdateUserAccountC -> UserAccount entity.
//
// (How React pages work is explained at the top of SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
// useState = memory, useEffect = run code after drawing, useCallback = keep the
// same function between redraws.
import { useCallback, useEffect, useState } from 'react';
// Link = a clickable link to another page (no browser reload).
// useLocation = info about this page, including a message from the last page.
// useNavigate = navigate('/address') to change page from code.
// useParams = read the parts of the address marked with ":" in App.jsx (:id).
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api'; // calls the backend (adds cookie + CSRF token)
import Button from '../components/Button'; // styled button
import DetailsView from '../components/DetailsView'; // label: value list for one item
import Message from '../components/Message'; // green / red message box
import SuspendUserAccountPg from './SuspendUserAccountPg'; // the Suspend pop-up (#9)
import { statusLabel } from './userAccountShared'; // 'active' -> 'Active'

// The details to show, top to bottom. key = field in the account, label = text
// on the left. DetailsView shows '-' for empty values (e.g. no date of birth).
const FIELDS = [
  { key: 'username', label: 'User ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'profileName', label: 'User profile' },
  { key: 'status', label: 'Status' },
  { key: 'dob', label: 'Date of birth' },
];

export default function ViewUserAccountPg() {
  // useParams reads :id from the address. For /admin/accounts/5, id is "5"
  // (text, not a number). { id } = take the "id" field out of the result.
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ---- State --------------------------------------------------------------------
  const [account, setAccount] = useState(null); // the account; null until loaded
  const [loading, setLoading] = useState(true); // true while waiting for the backend
  const [error, setError] = useState(''); // red message
  // Green message passed from Create or Update, e.g. 'Account created.'
  const [success, setSuccess] = useState(location.state?.message || '');
  const [suspendOpen, setSuspendOpen] = useState(false); // is the Suspend pop-up open?
  const [reactivating, setReactivating] = useState(false); // true while reactivating (spinner)

  // ---- displaySuccess / displayError ------------------------------------------------
  // useCallback keeps these the same between redraws so the useEffect below
  // does not rerun forever (full explanation in SearchUserAccountPg.jsx).
  const displaySuccess = useCallback((found) => {
    setAccount(found); // show the account
    setLoading(false); // hide "Loading..."
  }, []);

  const displayError = useCallback((message) => {
    setError(message || 'The account could not be loaded. Try again.');
    setLoading(false);
  }, []);

  // ---- viewAccount: load the account --------------------------------------------------
  // Runs when the page opens, and again if the ID in the address changes
  // (id is in the [...] list at the end).
  useEffect(() => {
    // "active" ignores a reply that arrives after the user has left the page
    // or opened a different account. The cleanup below sets it to false.
    let active = true;
    api.get(`/user-accounts/${id}`) // GET /api/user-accounts/5
      .then((found) => { if (active) displaySuccess(found); })
      // For a wrong ID the backend replies 404 'User account not found.',
      // and that message is shown in the red box.
      .catch((err) => { if (active) displayError(err.message); });
    return () => { active = false; };
  }, [id, displaySuccess, displayError]);

  // ---- afterSuspend: the Suspend pop-up calls this when it succeeds --------------------
  function afterSuspend(updated) {
    setSuspendOpen(false); // close the pop-up
    setAccount(updated); // show the new status (Suspended) without reloading
    setSuccess('Account suspended. This user can no longer log in.');
  }

  // ---- reactivateAccount: runs when Reactivate is clicked (#8, alternative flow) ------
  // No confirm pop-up: reactivating is easy to undo (just suspend again).
  async function reactivateAccount() {
    setReactivating(true); // spinner on the button, blocks double-clicks
    setError(''); // clear old messages
    setSuccess('');
    try {
      // PUT /api/user-accounts/5 with only the status. Nothing else changes.
      const updated = await api.put(`/user-accounts/${account.id}`, { status: 'active' });
      setAccount(updated); // show the new status (Active) without reloading
      setSuccess('Account reactivated. This user can log in again.');
    } catch (err) {
      setError(err.message || 'The account could not be reactivated. Try again.');
    } finally {
      setReactivating(false); // always hide the spinner at the end
    }
  }

  // ---- What the page shows (JSX) --------------------------------------------------------
  return (
    // max-w-3xl limits the width so the details stay easy to read.
    <section className="grid max-w-3xl gap-6">
      {/* Link back to the list. "to" is the address it opens. */}
      <Link to="/admin/accounts" className="text-sm text-action underline">Back to user accounts</Link>

      {/* Heading row: the person's name on the left, buttons on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Show the name once loaded; until then show 'User account'. */}
        <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">{account ? account.name : 'User account'}</h1>

        {/* a && b in JSX means: only show b when a is true. So the buttons
            only appear once the account has loaded. */}
        {account && (
          <div className="flex flex-wrap gap-3">
            {/* Edit (#8): go to this account's edit page. */}
            <Button variant="secondary" onClick={() => navigate(`/admin/accounts/${account.id}/edit`)}>Edit</Button>
            {/* Suspend (#9) for an active account, Reactivate (#8) for a
                suspended one. a ? b : c shows exactly one of the two.
                The different "key"s tell React these are two different
                buttons. Without them, React reuses one button and fades its
                colour from green to red, which looks broken for a moment. */}
            {account.status === 'active'
              ? <Button key="suspend" variant="outline-danger" onClick={() => setSuspendOpen(true)}>Suspend</Button>
              : <Button key="reactivate" variant="primary" onClick={reactivateAccount} loading={reactivating}>Reactivate</Button>}
          </div>
        )}
      </div>

      {/* Message boxes (empty text = nothing shown). */}
      <Message type="success" text={success} />
      <Message type="error" text={error} />

      {/* Shown only while loading. */}
      {loading && <p role="status" className="text-muted">Loading...</p>}

      {/* The details, once loaded. The outer <div> draws the white card. */}
      {account && (
        <div className="rounded-card border border-border bg-surface px-5 py-2">
          {/* item = a copy of the account with the status shown as
              'Active' / 'Suspended' instead of the raw value. */}
          <DetailsView fields={FIELDS} item={{ ...account, status: statusLabel(account.status) }} />
        </div>
      )}

      {/* The Suspend pop-up. It opens when it is given an account:
          suspendOpen ? account : null = "the account if open, else nothing". */}
      <SuspendUserAccountPg
        account={suspendOpen ? account : null}
        onDone={afterSuspend}
        onCancel={() => setSuspendOpen(false)}
      />
    </section>
  );
}
