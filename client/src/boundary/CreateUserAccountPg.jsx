// =============================================================================
// BOUNDARY: CreateUserAccountPg  (user story #6: User Admin creates a user account)
// Methods from the design: createAccount(), displaySuccess(), displayError()
//
// Address: /admin/accounts/new   (from the "Create account" button)
//
// Flow: page opens -> loads the profile choices for the dropdown
//   -> form submitted -> POST /api/user-accounts
//   -> CreateUserAccountC -> UserAccount entity -> new account comes back
//   -> go to the new account's View page with "Account created."
//
// (How React pages work is explained at the top of SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useEffect, useState } from 'react'; // memory + run code after drawing
import { Link, useNavigate } from 'react-router-dom'; // links + changing page from code
import { api } from '../api'; // calls the backend
import FormFields from '../components/FormFields'; // draws a whole form from a list of fields
import Message from '../components/Message'; // green / red message box
// accountFields = the list of form fields; toRequestBody = turns the form's
// values into what the backend expects. Both in userAccountShared.js.
import { accountFields, toRequestBody } from './userAccountShared';

// Starting values: every box empty. The keys must match the field names in
// accountFields, so each box knows which value is its own.
const EMPTY = { username: '', password: '', name: '', email: '', profileId: '', dob: '' };

// =============================================================================
// FUNCTION: CreateUserAccountPg (the page itself)
// WHAT IT DOES: draws the create form and holds all its smaller functions.
// =============================================================================
export default function CreateUserAccountPg() {
  const navigate = useNavigate(); // navigate('/address') moves to another page

  // ---- State --------------------------------------------------------------------
  const [profiles, setProfiles] = useState(null); // dropdown choices; null = still loading
  const [error, setError] = useState(''); // red message at the top
  const [fieldErrors, setFieldErrors] = useState({}); // { username: 'message', ... } shown under each box
  const [saving, setSaving] = useState(false); // true while the form is being sent (spinner on the button)

  // ---------------------------------------------------------------------------
  // LOAD THE PROFILE CHOICES WHEN THE PAGE OPENS
  // [] at the end = run once, when the page first opens.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    api.get('/user-accounts/profiles') // GET /api/user-accounts/profiles
      // .then(setProfiles) is short for .then((list) => setProfiles(list)).
      .then(setProfiles)
      // If it fails: use an empty list (so the form still shows) and show the error.
      .catch((err) => { setProfiles([]); setError(err.message); });
  }, []);

  // ---------------------------------------------------------------------------
  // FUNCTION: displaySuccess
  // WHAT IT DOES: the account was created. Go to the new account's View page
  // and pass a message to show there.
  // ---------------------------------------------------------------------------
  function displaySuccess(account) {
    navigate(`/admin/accounts/${account.id}`, { state: { message: 'Account created.' } });
  } // End of displaySuccess.

  // ---------------------------------------------------------------------------
  // FUNCTION: displayError
  // WHAT IT DOES: the backend refused.
  // err.message = the main message, e.g. 'Some details are already in use.'
  // err.errors  = per-field messages from a 400 or 409 reply, e.g.
  //               { username: 'This user ID is already in use.' }
  // FormFields shows each one under its box and outlines the box in red.
  // ---------------------------------------------------------------------------
  function displayError(err) {
    // Show the main red message, or a fallback if the backend sent none.
    setError(err.message || 'The account could not be created. Try again.');
    // Show the messages under each box, if there are any.
    setFieldErrors(err.errors || {});
  } // End of displayError.

  // ---------------------------------------------------------------------------
  // FUNCTION: createAccount
  // WHAT IT DOES: runs when the form is submitted.
  // RECEIVES: values = everything typed into the form, e.g. { username: 'kaz', ... }.
  // "async" lets us use "await" to wait for the backend.
  // ---------------------------------------------------------------------------
  async function createAccount(values) {
    setSaving(true); // show the spinner and block double-clicks
    setError(''); // clear old messages
    setFieldErrors({}); // clear old per-box messages
    // try { ... } catch { ... }: if anything inside try fails, jump to catch.
    try {
      // POST /api/user-accounts with the cleaned-up values.
      const account = await api.post('/user-accounts', toRequestBody(values));
      // It worked, so go to the new account's page.
      displaySuccess(account);
    } catch (err) {
      // It failed, so show the messages.
      displayError(err);
    } finally {
      // finally always runs, success or not: hide the spinner.
      setSaving(false);
    }
  } // End of createAccount.

  // ---- What the page shows (JSX) --------------------------------------------------------
  return (
    // max-w-2xl keeps the form a comfortable width (UI_GUIDELINES: forms up to 672px).
    <section className="grid max-w-2xl gap-6">
      {/* Link back to the list. */}
      <Link to="/admin/accounts" className="text-sm text-action underline">Back to user accounts</Link>
      {/* The page heading. */}
      <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">Create account</h1>

      {/* Red message box (nothing shown when error is ''). */}
      <Message type="error" text={error} />

      {/* Until the profiles have loaded, show "Loading..."; then the form.
          The form waits because its dropdown needs the profile list. */}
      {profiles === null
        ? <p role="status" className="text-muted">Loading...</p>
        : (
          <FormFields
            fields={accountFields(profiles)} // the boxes to draw (Create version: password required)
            initial={EMPTY} // starting values: all empty
            submitLabel="Create account" // the button text
            onSubmit={createAccount} // what to run on submit; gets the typed values
            errors={fieldErrors} // per-box error messages from the backend
            isSubmitting={saving} // shows the spinner and disables the boxes while saving
          />
        )}
    </section>
  );
} // End of CreateUserAccountPg.
