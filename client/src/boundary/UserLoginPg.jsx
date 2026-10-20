// BOUNDARY: UserLoginPg  (user stories: Login for all 4 actors)
// Methods from the design: displaySuccess(), displayError()
//
// TODO (Login story owner): replace the PLACEHOLDER block with a real call:
//   const account = await api.post('/login', { username, password, profile });
//   if account is returned -> displaySuccess(account), else -> displayError()
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, setUser } from '../session';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Message from '../components/Message';

const HOME = {
  'User Admin': '/admin',
  'Interior Designer': '/designer',
  Customer: '/customer',
  'Platform Manager': '/manager',
};

export default function UserLoginPg() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState(ROLES[0]);
  const [error, setError] = useState('');

  function displaySuccess(account) {
    setUser({ name: account.name, role: profile });
    navigate(HOME[profile]);
  }

  function displayError() {
    setError('Login failed. Check your ID, password and user profile.');
  }

  function handleSubmit(e) {
    e.preventDefault();
    // ---- PLACEHOLDER: lets the team see each role's menu until Login is built ----
    if (username && password) displaySuccess({ name: username });
    else displayError();
    // ---- END PLACEHOLDER ----
  }

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <section className="rounded-panel border border-border bg-surface p-6 shadow-card sm:p-9">
        <h1 className="text-3xl tracking-tight text-ink">Login</h1>
        <div className="mt-6">
          <Message type="error" text={error} />
        </div>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <FormField
            id="username"
            name="username"
            label="User ID"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <FormField
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FormField
            id="profile"
            name="profile"
            label="User profile"
            options={ROLES.map((role) => ({ value: role, label: role }))}
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
          />
          <Button type="submit" variant="primary" className="mt-1 w-full">Login</Button>
        </form>
      </section>
    </div>
  );
}
