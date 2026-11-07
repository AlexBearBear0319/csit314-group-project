// =============================================================================
// BOUNDARY: SaveShortlistPg  (user story #34: Customer saves an IDP to the shortlist)
// Methods from the design: saveProject(), displaySuccess(), displayError()
//
// Address: /customer/shortlist/save  (the "Find projects to save" button on My Shortlist)
// This page shows:
//   - a search bar for all projects        (uses the browse search, #32)
//   - a table of projects, 9 per page
//   - Save on each row                     (#34)
//   - Saved (greyed out) on projects already in the shortlist
//
// Flow when Save is clicked: POST /api/customer/shortlist { projectId }
//   -> SaveShortlistC -> ShortlistItem entity -> green message, row shows Saved
//
// (How React pages work is explained at the top of SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
// useCallback = keep the same function between redraws. useEffect = run code
// after drawing. useState = memory.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // a clickable link to another page
import { api } from '../api'; // calls the backend
import Button from '../components/Button'; // the shared button
import Message from '../components/Message'; // green or red message box
import ResultsTable from '../components/ResultsTable'; // a table with action buttons per row
import SearchBar from '../components/SearchBar'; // a search box + Search button
import { statusLabel } from './userAccountShared'; // turns 'current' into 'Current'

// The table's columns. key = the field in each project, label = the heading.
const COLUMNS = [
  { key: 'name', label: 'Project name' }, // column 1
  { key: 'propertyType', label: 'Property type' }, // column 2
  { key: 'designStyle', label: 'Design style' }, // column 3
  { key: 'status', label: 'Status' }, // column 4
];

// =============================================================================
// FUNCTION: SaveShortlistPg (the page itself)
// WHAT IT DOES: draws the Save to shortlist page and holds all its smaller functions.
// =============================================================================
export default function SaveShortlistPg() {
  // ---- State: what this page remembers ----------------------------------------
  const [projects, setProjects] = useState([]); // the projects on this page of results
  const [keyword, setKeyword] = useState(''); // the current search text; '' = show everything
  const [page, setPage] = useState(1); // which page of results is showing (starts at 1)
  const [totalPages, setTotalPages] = useState(0); // how many pages of results there are
  const [refreshKey, setRefreshKey] = useState(0); // a counter; changing it reloads the list
  const [savedIds, setSavedIds] = useState(() => new Set()); // IDs already in the shortlist
  const [savingId, setSavingId] = useState(null); // the project being saved right now; null = none
  const [loading, setLoading] = useState(true); // true while waiting for the project list
  const [error, setError] = useState(''); // red message; '' = no message shown
  const [success, setSuccess] = useState(''); // green message; '' = no message shown

  // ---------------------------------------------------------------------------
  // FUNCTION: showProjects
  // WHAT IT DOES: puts one page of search results into the table.
  // RECEIVES: result = { projects, page, totalPages } from the backend.
  // ---------------------------------------------------------------------------
  const showProjects = useCallback((result) => {
    setProjects(result.projects); // put the projects in the table
    setTotalPages(result.totalPages); // remember how many pages there are
    setLoading(false); // hide "Loading projects..."
  }, []);

  // ---------------------------------------------------------------------------
  // FUNCTION: displaySuccess
  // WHAT IT DOES: shows a green message after a project is saved.
  // RECEIVES: message = the text to show.
  // ---------------------------------------------------------------------------
  const displaySuccess = useCallback((message) => {
    setError(''); // remove any old red message
    setSuccess(message); // show the green message
  }, []);

  // ---------------------------------------------------------------------------
  // FUNCTION: displayError
  // WHAT IT DOES: shows a red message when loading or saving failed.
  // RECEIVES: message = the text from the backend (may be empty).
  // ---------------------------------------------------------------------------
  const displayError = useCallback((message) => {
    setSuccess(''); // remove any old green message
    // || gives a fallback message if the backend did not send one.
    setError(message || 'Something went wrong. Try again.');
    setLoading(false); // hide "Loading projects..."
  }, []);

  // ---------------------------------------------------------------------------
  // LOADING WHAT IS ALREADY SAVED
  // Runs once when the page opens. It asks for this Customer's shortlist so
  // those rows can show "Saved" instead of "Save". If it fails, the page still
  // works: the backend refuses a second save with a clear message anyway.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true; // stops a late reply from changing a closed page
    api.get('/customer/shortlist?keyword=')
      // Keep only the IDs, in a Set (a list that answers "is this in it?" quickly).
      .then((list) => { if (active) setSavedIds(new Set(list.map((project) => project.id))); })
      .catch(() => {}); // ignore: see the note above
    return () => { active = false; }; // the cleanup function
  }, []);

  // ---------------------------------------------------------------------------
  // LOADING THE PROJECTS FROM THE BACKEND
  // Runs when the page opens, and whenever keyword, page or refreshKey changes.
  // It uses the same search the Customer browse page uses (GET /api/customer/idps).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // "active" stops an old, slow reply from overwriting a newer one.
    let active = true;
    // Ask the backend. encodeURIComponent makes the text safe inside a web address.
    api.get(`/customer/idps?keyword=${encodeURIComponent(keyword)}&page=${page}`)
      // The reply arrived, so show the projects.
      .then((result) => { if (active) showProjects(result); })
      // The request failed, so show the message.
      .catch((err) => { if (active) displayError(err.message); });
    // The cleanup function: React runs it before the next load.
    return () => { active = false; };
  }, [keyword, page, refreshKey, showProjects, displayError]);

  // ---------------------------------------------------------------------------
  // FUNCTION: searchProjects
  // WHAT IT DOES: runs when Search is clicked. It goes back to page 1 and
  // changes keyword; the useEffect above notices and does the loading.
  // RECEIVES: text = the words typed in the search box.
  // ---------------------------------------------------------------------------
  function searchProjects(text) {
    setLoading(true); // show "Loading projects..."
    setError(''); // clear any old red message
    setSuccess(''); // clear any old green message
    setPage(1); // new search results start on page 1
    setKeyword(text); // remember the new search text
    setRefreshKey((key) => key + 1); // add 1, so the same search twice still reloads
  } // End of searchProjects.

  // ---------------------------------------------------------------------------
  // FUNCTION: goToPage
  // WHAT IT DOES: runs when Previous or Next is clicked.
  // RECEIVES: next = the page number to show.
  // ---------------------------------------------------------------------------
  function goToPage(next) {
    setLoading(true); // show "Loading projects..."
    setPage(next); // the useEffect above loads that page
  } // End of goToPage.

  // ---------------------------------------------------------------------------
  // FUNCTION: saveProject  (#34)
  // WHAT IT DOES: runs when Save is clicked on a row. It sends the project's ID
  // to the backend. The backend reads who is logged in from the session, so
  // the page never sends the Customer's ID.
  // RECEIVES: row = the project on that row.
  // ---------------------------------------------------------------------------
  function saveProject(row) {
    setSavingId(row.id); // greys out this row's button while saving
    api.post('/customer/shortlist', { projectId: row.id })
      .then(() => {
        // Saved: remember the ID so the row now shows "Saved".
        setSavedIds((ids) => new Set(ids).add(row.id));
        displaySuccess(`${row.name} was saved to your shortlist.`);
      })
      .catch((err) => {
        // 409 = it was already saved (for example, in another browser tab).
        // The row should show "Saved" in that case too.
        if (err.status === 409) setSavedIds((ids) => new Set(ids).add(row.id));
        displayError(err.message);
      })
      // Whatever happened, the button is no longer busy.
      .finally(() => setSavingId(null));
  } // End of saveProject.

  // ---- Data for the table -----------------------------------------------------------
  // The same projects, with the status turned into 'Current' or 'Past'.
  const rows = projects.map((project) => ({ ...project, status: statusLabel(project.status) }));

  // ---- What the page shows (JSX) ------------------------------------------------------
  return (
    <section className="grid min-w-0 gap-6">
      {/* The page heading and a link back to the list. */}
      <div className="grid gap-2">
        <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">Save to shortlist</h1>
        <Link to="/customer/shortlist" className="text-sm text-action underline">Back to my shortlist</Link>
      </div>

      {/* Green and red message boxes (nothing shown when the text is ''). */}
      <Message type="success" text={success} />
      <Message type="error" text={error} />

      {/* Search box. When Search is clicked, SearchBar calls searchProjects. */}
      <SearchBar placeholder="Search by project name, description, property type or design style" onSearch={searchProjects} />

      {/* While loading, show the status line; otherwise show the table. */}
      {loading
        ? <p role="status" className="text-muted">Loading projects...</p>
        : (
          <ResultsTable
            ariaLabel="Projects to save" // the table's name for screen readers
            columns={COLUMNS} // the headings
            rows={rows} // the projects
            actions={[
              // Save: only on rows that are not saved yet. Greyed out while saving.
              {
                label: 'Save',
                variant: 'primary',
                show: (row) => !savedIds.has(row.id),
                disabled: (row) => savingId === row.id,
                onClick: saveProject,
              },
              // Saved: only on rows already in the shortlist. Always greyed out.
              { label: 'Saved', show: (row) => savedIds.has(row.id), disabled: true, onClick: () => {} },
            ]}
          />
        )}

      {/* Page buttons, only when there is more than one page. */}
      {!loading && totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-3">
          {/* Previous: greyed out on page 1. */}
          <Button size="sm" variant="secondary" type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          {/* Next: greyed out on the last page. */}
          <Button size="sm" variant="secondary" type="button" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </section>
  );
} // End of SaveShortlistPg.
