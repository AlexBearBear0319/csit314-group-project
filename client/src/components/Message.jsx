// Message — shows success or error. Every boundary uses this for
// displaySuccess() / displayError().  Usage: <Message type="success" text="Done" />
export default function Message({ type, text }) {
  if (!text) return null;
  const isSuccess = type === 'success';

  return (
    <div
      className={`mb-5 rounded-control border px-4 py-3 text-sm ${
        isSuccess
          ? 'border-action-soft bg-action-soft text-action-ink'
          : 'border-danger-soft bg-danger-soft text-danger'
      }`}
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
    >
      {text}
    </div>
  );
}
