// Dashboard — the home page each role lands on after login.

export default function Dashboard({ role }) {
  return (
    <h1 className="text-4xl tracking-tight text-ink sm:text-5xl">{role} Dashboard</h1>
  );
}
