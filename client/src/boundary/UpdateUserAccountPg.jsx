// =============================================================================
// BOUNDARY: UpdateUserAccountPg  (user story #8: User Admin updates a user account)
// Methods from the design: updateAccount(), displaySuccess(), displayError()
//
// Address: /admin/accounts/:id/edit   e.g. /admin/accounts/5/edit
//
// Flow: page opens -> loads the account and the profile choices
//   -> form filled in with the current values -> Save clicked
//   -> PUT /api/user-accounts/5 -> UpdateUserAccountC -> UserAccount entity
//   -> back to the View page with "Account updated."
//
// (How React pages work is explained at the top of SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useEffect, useState } from 'react'; // memory + run code after drawing
// Link = link to another page; useNavigate = change page from code;
// useParams = read :id from the address.
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api'; // calls the backend
import FormFields from '../components/FormFields'; // draws a whole form from a list of fields
import Message from '../components/Message'; // green / red message box
import { accountFields, toRequestBody } from './userAccountShared'; // shared form fields + body builder

export default function UpdateUserAccountPg() {
  const { id } = useParams(); // "5" from /admin/accounts/5/edit
  const navigate = useNavigate();

  // ---- State --------------------------------------------------------------------
  const [initial, setInitial] = useState(null); // the form's starting values; null = still loading
  const [profiles, setProfiles] = useState([]); // dropdown choices
  const [error, setError] = useState(''); // red message at the top
  const [fieldErrors, setFieldErrors] = useState({}); // per-box messages from the backend
  const [saving, setSaving] = useState(false); // true while saving (spinner)

  // ---- Load the account and the profile list when the page opens ------------------
  // [id] at the end = run when the page opens, and again if the ID changes.
  useEffect(() => {
    // Promise.all sends both requests at the same time and waits for BOTH.
    // The results come back as a list in the same order: [account, profileList].
    Promise.all([api.get(`/user-accounts/${id}`), api.get('/user-accounts/profiles')])
      .then(([account, profileList]) => {
        setProfiles(profileList);
        // Fill the form with the account's current values.
        setInitial({
          username: account.username,
          // The password box starts empty: the backend never sends passwords,
          // and leaving it blank means "keep the current password".
          password: '',
          name: account.name,
          email: account.email,
          // Dropdown values are text, so turn the number 3 into "3".
          profileId: String(account.profileId),
          // A date box needs '' rather than null when there is no date.
          dob: account.dob || '',
        });
      })
      // e.g. 'User account not found.' for a wrong ID.
      .catch((err) => setError(err.message));
  }, [id]);

  // ---- displaySuccess: saved -------------------------------------------------------
  // Go back to the View page and pass a message to show there.
  function displaySuccess(account) {
    navigate(`/admin/accounts/${account.id}`, { state: { message: 'Account updated.' } });
  }

  // ---- displayError: the backend refused --------------------------------------------
  // Same as Create: a main message plus per-box messages (e.g. user ID in use).
  function displayError(err) {
    setError(err.message || 'The account could not be updated. Try again.');
    setFieldErrors(err.errors || {});
  }

  // ---- updateAccount: runs when Save changes is clicked --------------------------------
  async function updateAccount(values) {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      // PUT /api/user-accounts/5. toRequestBody leaves out an empty password
      // and an empty date of birth, so the backend keeps the old ones.
      displaySuccess(await api.put(`/user-accounts/${id}`, toRequestBody(values)));
    } catch (err) {
      displayError(err);
    } finally {
      setSaving(false); // always hide the spinner at the end
    }
  }

  // ---- What the page shows (JSX) --------------------------------------------------------
  return (
    <section className="grid max-w-2xl gap-6">
      {/* Back to this account's View page. */}
      <Link to={`/admin/accounts/${id}`} className="text-sm text-action underline">Back to account</Link>
      <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">Edit account</h1>
      <Message type="error" text={error} />

      {/* Only draw the form once the current values have loaded. FormFields
          reads its starting values once, when it first appears, so drawing it
          early would leave the boxes empty. */}
      {initial && (
        <FormFields
          fields={accountFields(profiles, true)} // true = Update version (password optional)
          initial={initial} // the current values
          submitLabel="Save changes"
          onSubmit={updateAccount}
          errors={fieldErrors}
          isSubmitting={saving}
        />
      )}

      {/* "Loading..." while waiting, but not if loading failed (the error shows instead). */}
      {!initial && !error && <p role="status" className="text-muted">Loading...</p>}
    </section>
  );
}
