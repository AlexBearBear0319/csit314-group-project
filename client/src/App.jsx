// App.jsx — the list of page addresses (routes).
// When you build a story's boundary page, swap its ComingSoon route for your page.
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import UserLoginPg from './boundary/UserLoginPg';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<UserLoginPg />} />

        {/* User Admin */}
        <Route path="/admin" element={<Dashboard role="User Admin" />} />
        <Route path="/admin/accounts" element={<ComingSoon title="User Accounts" />} />
        <Route path="/admin/profiles" element={<ComingSoon title="User Profiles" />} />

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
        <Route path="/manager/categories" element={<ComingSoon title="IDP Categories" />} />
        <Route path="/manager/reports" element={<ComingSoon title="Reports" />} />

        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Route>
    </Routes>
  );
}
