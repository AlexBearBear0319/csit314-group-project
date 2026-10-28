import RequireRole from './RequireRole';

export default function UserAdminRoute() {
  return <RequireRole role="User Admin" />;
}
