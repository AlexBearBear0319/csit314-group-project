// =============================================================================
// BOUNDARY: UserLoginPg                   (BCE: Boundary layer)
// User stories #11, #18, #37, #47: a User Admin, Interior Designer, Customer and
// Platform Manager can log in. All four roles use this one page. After the
// login, homeForRole() opens the home screen of the role.
//
// What this page does (the steps of our sequence diagram for login):
//   1. shows the form: user ID and password
//   2. validateInput()           both boxes must be filled BEFORE we send
//   3. login()                   sends { username, password } to UserLoginC
//                                (POST /api/login)
//   4. displaySuccess(account)   the login worked: open the home screen
//      displayError(failure)     the login failed: show the message
//                                (for example "Wrong user ID or password.")
// =============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import { homeForRole, hydrateSession, setUser, useSession } from '../session';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Message from '../components/Message';

export default function UserLoginPg() {
  const navigate = useNavigate();
  const { user, status, error: sessionError } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(homeForRole(user.role), { replace: true });
  }, [navigate, user]);

  // Step 4: the login worked. Keep the user in the session and open their home.
  function displaySuccess({ account, csrfToken, expiresAt }) {
    setUser(account, csrfToken, expiresAt);
    navigate(homeForRole(account.role), { replace: true });
  }

  // Step 4: show what went wrong.
  function displayError(failure) {
    setError(failure instanceof ApiError ? failure.message : 'Login failed. Check your details and try again.');
  }

  // Step 2: both boxes must be filled. Returns true if everything is fine.
  function validateInput() {
    if (!username.trim() || !password) {
      displayError(new ApiError('Enter your user ID and password.'));
      return false;
    }
    return true;
  }

  // Step 3: send the user ID and password to the controller.
  async function login(e) {
    e.preventDefault();
    setError('');
    if (!validateInput()) return;

    setIsSubmitting(true);
    try {
      displaySuccess(await api.post('/login', { username, password }));
    } catch (failure) {
      displayError(failure);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <section className="rounded-panel border border-border bg-surface p-6 shadow-card sm:p-9">
        <h1 className="text-3xl tracking-tight text-ink">Login</h1>
        <div className="mt-6">
          <Message type="error" text={error || (status === 'unavailable' ? sessionError : '')} />
          {status === 'unavailable' && (
            <Button type="button" variant="secondary" className="mb-5" onClick={hydrateSession}>
              Check connection
            </Button>
          )}
        </div>
        <form className="grid gap-5" onSubmit={login}>
          <FormField
            id="username"
            name="username"
            label="User ID"
            required
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <FormField
            id="password"
            name="password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" variant="primary" className="mt-1 w-full" loading={isSubmitting}>Login</Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          New here? <Link className="font-medium text-action underline" to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}
