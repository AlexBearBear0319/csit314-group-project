import { useId, useRef, useState } from 'react';
import Button from './Button';
import Message from './Message';

export default function ConfirmAction({ title, description, label, disabled = false, onConfirm }) {
  const dialog = useRef(null);
  const trigger = useRef(null);
  const pending = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setSaving(true); setError('');
    try { await onConfirm(); }
    catch (failure) { setError(failure.message); }
    finally { pending.current = false; setSaving(false); }
  }

  return <>
    <Button ref={trigger} type="button" variant="danger" className="w-fit" disabled={disabled}
      onClick={() => { setError(''); dialog.current.showModal(); }}>{label}</Button>
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { if (pending.current) event.preventDefault(); }}
      onClose={() => trigger.current?.focus()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-panel border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/40">
      <h2 id={titleId} className="font-display text-2xl">{title}</h2>
      <p id={descriptionId} className="my-4 break-words">{description}</p>
      <Message type="error" text={error} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" autoFocus disabled={saving}
          onClick={() => dialog.current.close()}>Cancel</Button>
        <Button type="button" variant="danger" loading={saving} onClick={confirm}>{label}</Button>
      </div>
    </dialog>
  </>;
}
