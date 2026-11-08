// =============================================================================
// BOUNDARY: SaveShortlistPg
// Story: "As a Customer, I want to save an IDP to my shortlist so that I can
// refer back to it later."
// Methods from the design: saveProject(), displaySuccess(), displayError()
//
// This is the heart-shaped Save button. It is not a page of its own any more:
// the Customer saves a project right where they found it, on its card in
// Search IDPs or inside the View project pop-up.
//
// Flow: Save clicked -> POST /api/customer/shortlist with the project's ID
//   -> SaveShortlistC -> ShortlistItem entity -> message shown, button says Saved
//
// What the parent passes in:
//   project = the project this button belongs to
//   saved   = true if the project is already in the shortlist
//   onSaved = tells the parent, so the card and the pop-up both show Saved
// =============================================================================

import { useState } from 'react';
import { api } from '../api';
import Button from '../components/Button';
import Message from '../components/Message';

// An outline heart that fills in once the project is saved. The word beside it
// says the same thing, so nobody has to rely on the picture alone.
function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20s-7.5-4.6-9.5-9.3C1.2 7.4 3.3 4.5 6.4 4.5c2.1 0 3.9 1.1 5.6 3.4 1.7-2.3 3.5-3.4 5.6-3.4 3.1 0 5.2 2.9 3.9 6.2C19.5 15.4 12 20 12 20Z" />
    </svg>
  );
}

export default function SaveShortlistPg({ project, saved, onSaved }) {
  const [saving, setSaving] = useState(false); // true while waiting for the backend
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function displaySuccess(message) {
    setError('');
    setSuccess(message);
  }

  function displayError(message) {
    setSuccess('');
    setError(message || 'Something went wrong. Try again.');
  }

  // row = the project on this card. Only its ID is sent: the backend works out
  // who the Customer is from the login, so nobody can save for someone else.
  function saveProject(row) {
    setSaving(true);
    api.post('/customer/shortlist', { projectId: row.id })
      .then(() => {
        onSaved(row.id);
        displaySuccess(`${row.name} was saved to your shortlist.`);
      })
      .catch((failure) => {
        // 409 means it is already saved, perhaps from another tab, so the
        // button should say Saved as well as showing the message.
        if (failure.status === 409) onSaved(row.id);
        displayError(failure.message);
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline-primary"
        className="w-full"
        loading={saving}
        disabled={saved}
        aria-label={saved ? `${project.name} is saved to your shortlist` : `Save ${project.name} to shortlist`}
        onClick={() => saveProject(project)}
      >
        <HeartIcon filled={saved} />
        {saved ? 'Saved' : 'Save'}
      </Button>
      <Message type="success" text={success} />
      <Message type="error" text={error} />
    </div>
  );
}
