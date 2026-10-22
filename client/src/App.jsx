// App.jsx — the list of page addresses (routes).
// When you build a story's boundary page, swap its ComingSoon route for your page.
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import UserLoginPg from './boundary/UserLoginPg';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import UserAdminRoute from './components/UserAdminRoute';
import SearchUserProfilePg from './boundary/SearchUserProfilePg';
import CreateUserProfilePg from './boundary/CreateUserProfilePg';
import ViewUserProfilePg from './boundary/ViewUserProfilePg';
import UpdateUserProfilePg from './boundary/UpdateUserProfilePg';
import SuspendUserProfilePg from './boundary/SuspendUserProfilePg';
import RoleRoute from './components/RoleRoute';
import CreateIDPCategoryPg from './boundary/CreateIDPCategoryPg';
import ViewIDPCategoryPg from './boundary/ViewIDPCategoryPg';
import UpdateIDPCategoryPg from './boundary/UpdateIDPCategoryPg';
import DeleteIDPCategoryPg from './boundary/DeleteIDPCategoryPg';
import SearchIDPCategoryPg from './boundary/SearchIDPCategoryPg';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<UserLoginPg />} />

        {/* User Admin */}
        <Route path="/admin" element={<Dashboard role="User Admin" />} />
        <Route path="/admin/accounts" element={<ComingSoon title="User Accounts" />} />
        <Route element={<UserAdminRoute />}>
          <Route path="/admin/profiles" element={<SearchUserProfilePg />} />
          <Route path="/admin/profiles/create" element={<CreateUserProfilePg />} />
          <Route path="/admin/profiles/:id" element={<ViewUserProfilePg />} />
          <Route path="/admin/profiles/:id/edit" element={<UpdateUserProfilePg />} />
          <Route path="/admin/profiles/:id/suspend" element={<SuspendUserProfilePg />} />
        </Route>

        {/* Interior Designer */}
        <Route path="/designer" element={<Dashboard role="Interior Designer" />} />
        <Route path="/designer/company" element={<ComingSoon title="Company Information" />} />
        <Route path="/designer/current-idps" element={<ComingSoon title="Current IDPs" />} />
        <Route path="/designer/past-idps" element={<ComingSoon title="Past IDPs" />} />

        {/* Customer */}
        <Route path="/customer" element={<Dashboard role="Customer" />} />
        <Route path="/customer/search" element={<ComingSoon title="Search IDPs" />} />
        <Route path="/customer/shortlist" element={<ComingSoon title="My Shortlist" />} />

        {/* Platform Manager */}
        <Route path="/manager" element={<Dashboard role="Platform Manager" />} />
        <Route element={<RoleRoute role="Platform Manager" />}>
          <Route path="/manager/categories" element={<SearchIDPCategoryPg />} />
          <Route path="/manager/categories/create" element={<CreateIDPCategoryPg />} />
          <Route path="/manager/categories/:id" element={<ViewIDPCategoryPg />} />
          <Route path="/manager/categories/:id/edit" element={<UpdateIDPCategoryPg />} />
          <Route path="/manager/categories/:id/delete" element={<DeleteIDPCategoryPg />} />
        </Route>
        <Route path="/manager/reports" element={<ComingSoon title="Reports" />} />

        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Route>
    </Routes>
  );
}
