import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Message from '../components/Message';
import { homeForRole, setUser, useSession } from '../session';

export function RegisterChoicePg() {
  const { user } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(homeForRole(user.role), { replace: true });
  }, [navigate, user]);

  return (
    <section className="mx-auto w-full max-w-[560px] rounded-panel border border-border bg-surface p-6 shadow-card sm:p-9">
      <h1 className="text-3xl tracking-tight text-ink">Create an account</h1>
      <div className="mt-6 grid gap-3">
        <Link className="rounded-control border border-border p-4 font-medium text-ink hover:bg-surface-hover focus-visible:outline-action" to="/register/customer">
          Customer
        </Link>
        <Link className="rounded-control border border-border p-4 font-medium text-ink hover:bg-surface-hover focus-visible:outline-action" to="/register/designer">
          Interior Designer
        </Link>
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account? <Link className="font-medium text-action underline" to="/login">Login</Link>
      </p>
    </section>
  );
}

export default function RegisterPg({ role }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const [values, setValues] = useState({ name: '', email: '', username: '', password: '', passwordConfirmation: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const endpoint = role === 'Interior Designer' ? '/register/designer' : '/register/customer';

  useEffect(() => {
    if (user) navigate(homeForRole(user.role), { replace: true });
  }, [navigate, user]);

  function change(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setErrors({});
    setIsSubmitting(true);
    try {
      const { account, csrfToken, expiresAt } = await api.post(endpoint, values);
      setUser(account, csrfToken, expiresAt);
      navigate(homeForRole(account.role), { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
        setErrors(requestError.errors || {});
      } else {
        setError('The account could not be created. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const fields = [
    { id: 'name', label: 'Full name', type: 'text', autoComplete: 'name', maxLength: 100 },
    { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254 },
    { id: 'username', label: 'User ID', type: 'text', autoComplete: 'username', minLength: 3, maxLength: 64 },
    { id: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', minLength: 12, maxLength: 72 },
    { id: 'passwordConfirmation', label: 'Confirm password', type: 'password', autoComplete: 'new-password', minLength: 12, maxLength: 72 },
  ];

  return (
    <section className="mx-auto w-full max-w-[560px] rounded-panel border border-border bg-surface p-6 shadow-card sm:p-9">
      <h1 className="text-3xl tracking-tight text-ink">Create a {role} account</h1>
      <div className="mt-6"><Message type="error" text={error} /></div>
      <form className="grid gap-5" onSubmit={submit} aria-busy={isSubmitting || undefined}>
        {fields.map((field) => (
          <FormField
            key={field.id}
            id={field.id}
            name={field.id}
            label={field.label}
            type={field.type}
            autoComplete={field.autoComplete}
            minLength={field.minLength}
            maxLength={field.maxLength}
            required
            disabled={isSubmitting}
            value={values[field.id]}
            onChange={change}
            error={errors[field.id]}
          />
        ))}
        <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        <Link className="font-medium text-action underline" to="/login">Back to login</Link>
      </p>
    </section>
  );
}
