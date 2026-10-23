// BOUNDARY: UserLoginPg (login for all four roles)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import { homeForRole, setUser, useSession } from '../session';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Message from '../components/Message';

export default function UserLoginPg() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      const { account, csrfToken, expiresAt } = await api.post('/login', { username, password });
      setUser(account, csrfToken, expiresAt);
      navigate(homeForRole(account.role), { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Login failed. Check your details and try again.');
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
