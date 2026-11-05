// =============================================================================
// BOUNDARY: SuspendUserAccountPg  (user story #9: User Admin suspends a user account)
// Methods from the design: suspendAccount(), displaySuccess(), displayError()
//
// A confirm pop-up ("Suspend this account?"). It is not a page of its own:
// SearchUserAccountPg and ViewUserAccountPg show it when Suspend is clicked.
//
// Flow: Suspend clicked -> this pop-up opens -> "Suspend account" clicked
//   -> POST /api/user-accounts/:id/suspend -> SuspendUserAccountC -> UserAccount entity
//
// Props (values the parent page passes in, like function arguments):
//   account   - the account to suspend, or null when the pop-up should be closed
//   onDone    - called with the updated account after a successful suspend
//   onCancel  - called when the user closes the pop-up without suspending
//
// (How React pages work is explained at the top of SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
// useRef = a handle on a real element on the page (here: the <dialog>).
// useEffect = run code after drawing. useState = memory.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api'; // calls the backend
import Button from '../components/Button'; // styled button
import Message from '../components/Message'; // red error box

// =============================================================================
// FUNCTION: SuspendUserAccountPg (the pop-up itself)
// WHAT IT DOES: draws the pop-up and holds all its smaller functions.
// { account, onDone, onCancel } takes the 3 props out of the props object.
// =============================================================================
export default function SuspendUserAccountPg({ account, onDone, onCancel }) {
  // dialogRef.current will point at the <dialog> element once it is drawn.
  const dialogRef = useRef(null);
  const [error, setError] = useState(''); // red message inside the pop-up
  const [loading, setLoading] = useState(false); // true while suspending (spinner)

  // ---------------------------------------------------------------------------
  // OPEN OR CLOSE THE POP-UP
  // Runs after every draw where account changed ([account] at the end).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const dialog = dialogRef.current; // the pop-up element on the page
    if (!dialog) return; // not drawn yet: nothing to do
    if (account && !dialog.open) {
      // An account was given and the pop-up is closed: open it.
      setError(''); // clear an error left from last time
      dialog.showModal(); // open on top of the page and block clicks behind it
    } else if (!account && dialog.open) {
      // No account any more and the pop-up is open: close it.
      dialog.close();
    }
  }, [account]);

  // ---------------------------------------------------------------------------
  // FUNCTION: displaySuccess
  // WHAT IT DOES: the suspend worked, so tell the parent page.
  // ---------------------------------------------------------------------------
  function displaySuccess(updated) {
    onDone(updated); // hand the updated account to the parent page
  } // End of displaySuccess.

  // ---------------------------------------------------------------------------
  // FUNCTION: displayError
  // WHAT IT DOES: the suspend failed, so show a red message in the pop-up.
  // ---------------------------------------------------------------------------
  function displayError(message) {
    // e.g. 'You cannot suspend your own account.' from the backend.
    setError(message || 'The account could not be suspended. Try again.');
  } // End of displayError.

  // ---------------------------------------------------------------------------
  // FUNCTION: suspendAccount
  // WHAT IT DOES: runs when "Suspend account" is clicked.
  // ---------------------------------------------------------------------------
  async function suspendAccount() {
    setLoading(true); // show the spinner and block double-clicks
    setError(''); // clear the old message
    // "try" means: run this, and if anything fails, jump to "catch".
    try {
      // POST /api/user-accounts/5/suspend (no body needed).
      const updated = await api.post(`/user-accounts/${account.id}/suspend`);
      // It worked, so tell the parent page.
      displaySuccess(updated);
    } catch (err) {
      // It failed, so show the message.
      displayError(err.message);
    } finally {
      // Always hide the spinner at the end.
      setLoading(false);
    }
  } // End of suspendAccount.

  // ---- What the pop-up shows (JSX) -------------------------------------------------
  return (
    // <dialog> is the browser's built-in pop-up element.
    <dialog
      ref={dialogRef} // connect dialogRef to this element
      // Styles: centred, rounded card; backdrop:... darkens the page behind it.
      className="m-auto w-[min(92vw,32rem)] rounded-panel border border-border bg-surface p-0 text-ink shadow-card backdrop:bg-ink/40"
      // Screen readers read the heading with this id as the pop-up's title.
      aria-labelledby="suspend-account-title"
      // Pressing Esc fires "cancel". preventDefault stops the browser closing it
      // by itself, so the parent page stays in charge of what is open. While
      // suspending (loading), Esc does nothing.
      onCancel={(event) => { event.preventDefault(); if (!loading) onCancel(); }}
    >
      {/* Only draw the contents while there is an account. */}
      {account && (
        <div className="grid gap-5 p-6">
          {/* The pop-up's heading. */}
          <h2 id="suspend-account-title" className="text-2xl">Suspend this account?</h2>
          {/* Say exactly who will be affected, so the admin can check. */}
          <p className="text-sm text-muted">
            {account.name} ({account.username}) will not be able to log in.
          </p>
          {/* Red message box (nothing shown when error is ''). */}
          <Message type="error" text={error} />
          {/* Buttons on the right: Cancel, then the red Suspend button. */}
          <div className="flex flex-wrap justify-end gap-3">
            {/* Cancel closes the pop-up. It is disabled while suspending. */}
            <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
            {/* loading={loading} shows a spinner and blocks double-clicks. */}
            <Button variant="danger" onClick={suspendAccount} loading={loading}>Suspend account</Button>
          </div>
        </div>
      )}
    </dialog>
  );
} // End of SuspendUserAccountPg.
