import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import UserLoginPg from './boundary/UserLoginPg';
import RegisterPg, { RegisterChoicePg } from './boundary/RegisterPg';
import ManageCurrentIdpsPg from './boundary/ManageCurrentIdpsPg';
import ManagePastIdpsPg from './boundary/ManagePastIdpsPg';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import RequireRole from './components/RequireRole';
import { homeForRole, useSession } from './session';
import Button from './components/Button';
import { hydrateSession } from './session';

function SessionUnavailable() {
  return (
    <section className="mx-auto max-w-lg rounded-panel border border-border bg-surface p-6 shadow-card" role="alert">
      <h1 className="text-2xl text-ink">Cannot reach the sign-in service</h1>
      <p className="mt-3 text-sm text-muted">Check the connection and try again.</p>
      <Button className="mt-5" variant="secondary" onClick={hydrateSession}>Try again</Button>
    </section>
  );
}

function HomeRoute() {
  const { user, status } = useSession();
  if (status === 'checking') return <p role="status">Checking your sign-in.</p>;
  if (status === 'unavailable') return <SessionUnavailable />;
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />;
}

function UnknownRoute() {
  const { user, status } = useSession();
  if (status === 'checking') return <p role="status">Checking your sign-in.</p>;
  if (status === 'unavailable') return <SessionUnavailable />;
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<UserLoginPg />} />
        <Route path="/register" element={<RegisterChoicePg />} />
        <Route path="/register/customer" element={<RegisterPg role="Customer" />} />
        <Route path="/register/designer" element={<RegisterPg role="Interior Designer" />} />

        <Route element={<RequireRole role="User Admin" />}>
          <Route path="/admin" element={<Dashboard role="User Admin" />} />
          <Route path="/admin/accounts" element={<ComingSoon title="User Accounts" />} />
          <Route path="/admin/profiles" element={<ComingSoon title="User Profiles" />} />
        </Route>

        <Route element={<RequireRole role="Interior Designer" />}>
          <Route path="/designer" element={<Dashboard role="Interior Designer" />} />
          <Route path="/designer/company" element={<ComingSoon title="Company Information" />} />
          <Route path="/designer/current-idps" element={<ManageCurrentIdpsPg />} />
          <Route path="/designer/past-idps" element={<ManagePastIdpsPg />} />
        </Route>

        <Route element={<RequireRole role="Customer" />}>
          <Route path="/customer" element={<Dashboard role="Customer" />} />
          <Route path="/customer/search" element={<ComingSoon title="Search IDPs" />} />
          <Route path="/customer/shortlist" element={<ComingSoon title="My Shortlist" />} />
        </Route>

        <Route element={<RequireRole role="Platform Manager" />}>
          <Route path="/manager" element={<Dashboard role="Platform Manager" />} />
          <Route path="/manager/categories" element={<ComingSoon title="IDP Categories" />} />
          <Route path="/manager/reports" element={<ComingSoon title="Reports" />} />
        </Route>

        <Route path="*" element={<UnknownRoute />} />
      </Route>
    </Routes>
  );
}
