// =============================================================================
// BOUNDARY: SearchShortlistPg  (user story #35: Customer searches shortlisted IDPs)
// Methods from the design: searchSaved(), displaySuccess(), displayError()
//
// Address: /customer/shortlist  ("My Shortlist" in the Customer menu)
// This page shows:
//   - a search bar                        (#35)
//   - a table of saved projects           (#35)
//   - View on each row                    -> ViewShortlistPg (#36)
//   - a "Find projects to save" button    -> SaveShortlistPg (#34)
//
// Flow: page opens or Search clicked -> GET /api/customer/shortlist?keyword=...
//   -> SearchShortlistC -> ShortlistItem entity -> list comes back -> table updates
//
// (How React pages work is explained at the top of SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
// useCallback = keep the same function between redraws. useEffect = run code
// after drawing. useState = memory.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // change page from code
import { api } from '../api'; // calls the backend
import Button from '../components/Button'; // the shared button
import Message from '../components/Message'; // red error box
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
// FUNCTION: SearchShortlistPg (the page itself)
// WHAT IT DOES: draws the My Shortlist page and holds all its smaller functions.
// =============================================================================
export default function SearchShortlistPg() {
  const navigate = useNavigate(); // navigate('/address') moves to another page

  // ---- State: what this page remembers ----------------------------------------
  const [projects, setProjects] = useState([]); // the saved projects; [] = empty list at first
  const [keyword, setKeyword] = useState(''); // the current search text; '' = show everything
  const [refreshKey, setRefreshKey] = useState(0); // a counter; changing it reloads the list
  const [loading, setLoading] = useState(true); // true while waiting for the backend
  const [error, setError] = useState(''); // red message; '' = no message shown

  // ---------------------------------------------------------------------------
  // FUNCTION: displaySuccess
  // WHAT IT DOES: puts the loaded projects into the table.
  // useCallback keeps this the same between redraws so the useEffect below does
  // not rerun forever (full explanation in SearchUserAccountPg.jsx).
  // ---------------------------------------------------------------------------
  const displaySuccess = useCallback((list) => {
    setProjects(list); // put the projects in the table
    setLoading(false); // hide "Loading your shortlist..."
  }, []);

  // ---------------------------------------------------------------------------
  // FUNCTION: displayError
  // WHAT IT DOES: shows a red message when the list could not load.
  // ---------------------------------------------------------------------------
  const displayError = useCallback((message) => {
    // || gives a fallback message if the backend did not send one.
    setError(message || 'Your shortlist could not be loaded. Try again.');
    setLoading(false); // hide "Loading your shortlist..."
  }, []);

  // ---------------------------------------------------------------------------
  // LOADING THE LIST FROM THE BACKEND
  // Runs when the page opens, and whenever keyword or refreshKey changes.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // "active" stops an old, slow reply from overwriting a newer one.
    let active = true;
    // Ask the backend. encodeURIComponent makes the text safe inside a web address.
    api.get(`/customer/shortlist?keyword=${encodeURIComponent(keyword)}`)
      // The reply arrived, so show the list.
      .then((list) => { if (active) displaySuccess(list); })
      // The request failed, so show the message.
      .catch((err) => { if (active) displayError(err.message); });
    // The cleanup function: React runs it before the next load.
    return () => { active = false; };
  }, [keyword, refreshKey, displaySuccess, displayError]);

  // ---------------------------------------------------------------------------
  // FUNCTION: searchSaved
  // WHAT IT DOES: runs when Search is clicked. It changes keyword, and the
  // useEffect above notices and does the loading. refreshKey changes too, so
  // searching the same word twice still reloads.
  // RECEIVES: text = the words typed in the search box.
  // ---------------------------------------------------------------------------
  function searchSaved(text) {
    setLoading(true); // show "Loading your shortlist..."
    setError(''); // clear any old error
    setKeyword(text); // remember the new search text
    setRefreshKey((key) => key + 1); // add 1 to the counter
  } // End of searchSaved.

  // ---- Data for the table -----------------------------------------------------------
  // The same projects, with the status turned into 'Current' or 'Past'.
  const rows = projects.map((project) => ({ ...project, status: statusLabel(project.status) }));

  // ---- What the page shows (JSX) ------------------------------------------------------
  return (
    <section className="grid min-w-0 gap-6">
      {/* The page heading, with the button to find projects to save (#34) beside it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">My Shortlist</h1>
        {/* Goes to SaveShortlistPg at /customer/shortlist/save. */}
        <Button type="button" onClick={() => navigate('/customer/shortlist/save')}>Find projects to save</Button>
      </div>

      {/* Red message box (nothing shown when error is ''). */}
      <Message type="error" text={error} />

      {/* Search box. When Search is clicked, SearchBar calls searchSaved with
          the typed text. */}
      <SearchBar placeholder="Search by project name, property type or design style" onSearch={searchSaved} />

      {/* a ? b : c in JSX: while loading, show the status line; otherwise
          show the table. If loading failed, show neither (the error shows instead). */}
      {loading
        ? <p role="status" className="text-muted">Loading your shortlist...</p>
        : !error && (
          <ResultsTable
            ariaLabel="My shortlist" // the table's name for screen readers
            columns={COLUMNS} // the headings
            rows={rows} // the projects
            // View (#36): go to /customer/shortlist/5 for the project with id 5.
            actions={[{ label: 'View', onClick: (row) => navigate(`/customer/shortlist/${row.id}`) }]}
          />
        )}
    </section>
  );
} // End of SearchShortlistPg.
