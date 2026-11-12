// =============================================================================
// BOUNDARY: UpdateUserAccountPg           (BCE: Boundary layer)
// User story #8: As a User Admin, I want to update a user account so that I can
// manage platform access.
//
// What this page does (the steps of our sequence diagram for #8):
//   1. loads the account (GET /api/user-accounts/:id) and the profile choices,
//      then opens the form with the current values
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. updateAccount(values)     sends the values to UpdateUserAccountC
//                                (PUT /api/user-accounts/:id)
//   4. displaySuccess(account)   saved: go back to the account
//      displayError(failure)     something is wrong: show the message
//
// The password box starts empty. If it stays empty, the password is not changed.
// =============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { accountFields, toRequestBody, validateAccountInput } from './userAccountShared';

export default function UpdateUserAccountPg() {
  const { id } = useParams(); // "5" from /admin/accounts/5/edit
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null); // the form's starting values. null = still loading
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Step 1: load the account and the dropdown choices together.
  useEffect(() => {
    Promise.all([api.get(`/user-accounts/${id}`), api.get('/user-accounts/profiles')])
      .then(([account, profileList]) => {
        setProfiles(profileList);
        setInitial({
          username: account.username,
          password: '', // never shown
          name: account.name,
          email: account.email,
          profileId: String(account.profileId),
          dob: account.dob || '',
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  // Step 4: the account was saved.
  function displaySuccess(account) {
    navigate(`/admin/accounts/${account.id}`, { state: { message: 'Account updated.' } });
  }

  // Step 4: show what went wrong (from validateInput or from the server).
  function displayError(err) {
    setError(err.message || 'The account could not be updated. Try again.');
    setFieldErrors(err.errors || {});
  }

  // Step 2: check the boxes. Returns true if everything is fine.
  function validateInput(values) {
    const problems = validateAccountInput(values, { isUpdate: true });
    if (Object.keys(problems).length) {
      displayError({ message: 'Check the fields and try again.', errors: problems });
      return false;
    }
    return true;
  }

  // Step 3: send the changes to the controller.
  async function updateAccount(values) {
    setError('');
    setFieldErrors({});
    if (!validateInput(values)) return;

    setSaving(true);
    try {
      displaySuccess(await api.put(`/user-accounts/${id}`, toRequestBody(values)));
    } catch (err) {
      displayError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid max-w-2xl gap-6">
      <Link to={`/admin/accounts/${id}`} className="text-sm text-action underline">Back to account</Link>
      <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">Edit account</h1>
      <Message type="error" text={error} />
      {/* FormFields reads its starting values once, when it first appears, so we
          only draw it after the current values have loaded. */}
      {initial && (
        <FormFields
          fields={accountFields(profiles, true)}
          initial={initial}
          submitLabel="Save changes"
          onSubmit={updateAccount}
          errors={fieldErrors}
          isSubmitting={saving}
        />
      )}
      {!initial && !error && <p role="status" className="text-muted">Loading...</p>}
    </section>
  );
}
