// BOUNDARY: UserLoginPg  (user stories: Login for all 4 actors)
// Methods from the design: displaySuccess(), displayError()
//
// TODO (Login story owner): replace the PLACEHOLDER block with a real call:
//   const account = await api.post('/login', { username, password, profile });
//   if account is returned -> displaySuccess(account), else -> displayError()
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, setUser } from '../session';
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
    <div className="row justify-content-center">
      <div className="col-md-5">
        <h2 className="mb-4">Login</h2>
        <Message type="error" text={error} />
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="username">User ID</label>
            <input id="username" className="form-control" value={username}
              onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-control" value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="profile">User profile</label>
            <select id="profile" className="form-select" value={profile}
              onChange={(e) => setProfile(e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn btn-primary w-100" type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
