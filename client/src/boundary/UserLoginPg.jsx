// BOUNDARY: UserLoginPg (login for all four roles)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ROLES, homeForRole, setUser, useSession } from '../session';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Message from '../components/Message';

export default function UserLoginPg() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState(ROLES[0]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(homeForRole(user.role), { replace: true });
  }, [navigate, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { account, csrfToken } = await api.post('/login', { username, password, profile });
      setUser(account, csrfToken);
      navigate(homeForRole(account.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Login failed. Check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          <Button type="submit" variant="primary" className="mt-1 w-full" loading={isSubmitting}>Login</Button>
        </form>
      </section>
    </div>
  );
}
