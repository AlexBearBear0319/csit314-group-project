// =============================================================================
// BOUNDARY: RegisterPg / RegisterChoicePg (BCE: Boundary layer)
// Sign-up for a Customer or an Interior Designer. (A User Admin creates other
// accounts with CreateUserAccountPg, story #6.)
//
// RegisterChoicePg  asks "Customer or Interior Designer?" and links to RegisterPg.
//
// What RegisterPg does (the steps of our sequence diagram for sign-up):
//   1. shows the form: name, email, user ID, password, confirm password
//   2. validateInput()           checks every box BEFORE anything is sent
//   3. register()                sends the values to RegisterAccountC
//                                (POST /api/register/customer or /designer)
//   4. displaySuccess(result)    the account is made and logged in: open home
//      displayError(failure)     something is wrong: show the message
// =============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Message from '../components/Message';
import { homeForRole, setUser, useSession } from '../session';
import { EMAIL_PATTERN, USERNAME_PATTERN, checkPassword, checkRequiredText, onlyProblems, text } from './inputRules';

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

  // Step 4: the account is made and the user is logged in.
  function displaySuccess({ account, csrfToken, expiresAt }) {
    setUser(account, csrfToken, expiresAt);
    navigate(homeForRole(account.role), { replace: true });
  }

  // Step 4: show what went wrong (from validateInput or from the server).
  function displayError(failure) {
    if (failure instanceof ApiError) {
      setError(failure.message);
      setErrors(failure.errors || {});
    } else {
      setError('The account could not be created. Try again.');
    }
  }

  // Step 2: check every box. Same rules as the server. Returns true if all fine.
  function validateInput() {
    const email = text(values.email).toLowerCase();
    const problems = onlyProblems({
      name: checkRequiredText(values.name, { label: 'name', max: 100 }),
      email: EMAIL_PATTERN.test(email) && email.length <= 254 ? '' : 'Enter a valid email address.',
      username: USERNAME_PATTERN.test(text(values.username)) ? '' : 'Use 3 to 64 letters, numbers, dots, underscores or hyphens.',
      password: checkPassword(values.password),
      passwordConfirmation: values.passwordConfirmation === values.password ? '' : 'Passwords do not match.',
    });
    if (Object.keys(problems).length) {
      displayError(new ApiError('Check the fields and try again.', { data: { errors: problems } }));
      return false;
    }
    return true;
  }

  // Step 3: send the form to the controller.
  async function submit(event) {
    event.preventDefault();
    setError('');
    setErrors({});
    if (!validateInput()) return;

    setIsSubmitting(true);
    try {
      displaySuccess(await api.post(endpoint, values));
    } catch (failure) {
      displayError(failure);
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
