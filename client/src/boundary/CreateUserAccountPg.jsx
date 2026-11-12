// =============================================================================
// BOUNDARY: CreateUserAccountPg           (BCE: Boundary layer)
// User story #6: As a User Admin, I want to create a user account so that I can
// manage platform access.
//
// What this page does (the steps of our sequence diagram for #6):
//   1. loads the profile choices (GET /api/user-accounts/profiles) and shows the
//      form: user ID, password, name, email, profile and date of birth
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. createAccount(values)     sends the values to CreateUserAccountC
//                                (POST /api/user-accounts)
//   4. displaySuccess(account)   saved: open the new account
//      displayError(failure)     something is wrong: show the message
//                                (for example "This user ID is already in use.")
// =============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { accountFields, toRequestBody, validateAccountInput } from './userAccountShared';

// The form starts with every box empty.
const EMPTY = { username: '', password: '', name: '', email: '', profileId: '', dob: '' };

export default function CreateUserAccountPg() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(null); // dropdown choices. null = still loading
  const [error, setError] = useState(''); // red message at the top
  const [fieldErrors, setFieldErrors] = useState({}); // messages under each box
  const [saving, setSaving] = useState(false);

  // Step 1: load the choices for the "User profile" dropdown.
  useEffect(() => {
    api.get('/user-accounts/profiles')
      .then(setProfiles)
      .catch((err) => { setProfiles([]); setError(err.message); });
  }, []);

  // Step 4: the account was saved.
  function displaySuccess(account) {
    navigate(`/admin/accounts/${account.id}`, { state: { message: 'Account created.' } });
  }

  // Step 4: show what went wrong (from validateInput or from the server).
  function displayError(err) {
    setError(err.message || 'The account could not be created. Try again.');
    setFieldErrors(err.errors || {});
  }

  // Step 2: check the boxes. Returns true if everything is fine.
  function validateInput(values) {
    const problems = validateAccountInput(values);
    if (Object.keys(problems).length) {
      displayError({ message: 'Check the fields and try again.', errors: problems });
      return false;
    }
    return true;
  }

  // Step 3: send the form to the controller.
  async function createAccount(values) {
    setError('');
    setFieldErrors({});
    if (!validateInput(values)) return;

    setSaving(true); // spinner on the button, and no double click
    try {
      displaySuccess(await api.post('/user-accounts', toRequestBody(values)));
    } catch (err) {
      displayError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid max-w-2xl gap-6">
      <Link to="/admin/accounts" className="text-sm text-action underline">Back to user accounts</Link>
      <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">Create account</h1>
      <Message type="error" text={error} />
      {/* The form waits for the profile list, because its dropdown needs it. */}
      {profiles === null
        ? <p role="status" className="text-muted">Loading...</p>
        : (
          <FormFields
            fields={accountFields(profiles)}
            initial={EMPTY}
            submitLabel="Create account"
            onSubmit={createAccount}
            errors={fieldErrors}
            isSubmitting={saving}
          />
        )}
    </section>
  );
}
