import { Link, useLocation } from 'react-router-dom';
import Button from './Button';
import Message from './Message';

export default function RecordPanel({ title, listPath, backLabel, children }) {
  const { search } = useLocation();
  return (
    <section className="grid min-w-0 gap-6 rounded-panel border border-border bg-surface p-4 shadow-card md:p-8">
      <h1 className="break-words font-display text-4xl text-ink">{title}</h1>
      {children}
      <Link to={`${listPath}${search}`} className="w-fit text-action underline">{backLabel}</Link>
    </section>
  );
}

export function RecordLoadState({ loading, error, onRetry }) {
  return <>
    {loading && <p role="status">Loading…</p>}
    <Message type="error" text={error} />
    {error && onRetry && <Button type="button" variant="secondary" className="w-fit" onClick={onRetry}>Try again</Button>}
  </>;
}
