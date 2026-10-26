import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import UserLoginPg from './boundary/UserLoginPg';
import RegisterPg, { RegisterChoicePg } from './boundary/RegisterPg';
import ManageCurrentIdpsPg from './boundary/ManageCurrentIdpsPg';
import ManagePastIdpsPg from './boundary/ManagePastIdpsPg';
// User account pages (stories #6-10). Each import loads one page from the
// boundary folder so the routes below can show it.
import SearchUserAccountPg from './boundary/SearchUserAccountPg'; // #10 list + search
import CreateUserAccountPg from './boundary/CreateUserAccountPg'; // #6
import ViewUserAccountPg from './boundary/ViewUserAccountPg'; // #7
import UpdateUserAccountPg from './boundary/UpdateUserAccountPg'; // #8
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import RequireRole from './components/RequireRole';
import { homeForRole, useSession } from './session';

function HomeRoute() {
  const { user } = useSession();
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />;
}

function UnknownRoute() {
  const { user } = useSession();
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
          {/* User accounts, stories #6-10.
              <Route path="address" element={<Page />} /> means: when the browser
              is at this address, show this page. A part starting with ":" is a
              placeholder: /admin/accounts/5 matches "/admin/accounts/:id", and the
              page reads id = "5" with useParams().
              These routes sit inside <RequireRole role="User Admin">, so anyone
              who is not a logged-in User Admin is sent away before they load.
              Suspend (#9) has no address: it is a pop-up inside the Search and
              View pages. */}
          <Route path="/admin/accounts" element={<SearchUserAccountPg />} />
          <Route path="/admin/accounts/new" element={<CreateUserAccountPg />} />
          <Route path="/admin/accounts/:id" element={<ViewUserAccountPg />} />
          <Route path="/admin/accounts/:id/edit" element={<UpdateUserAccountPg />} />
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
