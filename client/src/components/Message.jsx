// Message — shows success or error. Every boundary uses this for
// displaySuccess() / displayError().  Usage: <Message type="success" text="Done" />
export default function Message({ type, text }) {
  if (!text) return null;
  const cls = type === 'success' ? 'alert-success' : 'alert-danger';
  return <div className={`alert ${cls}`} role="alert">{text}</div>;
}
