// =============================================================================
// BOUNDARY: ViewShortlistPg  (user story #36: Customer views a shortlisted IDP)
// Methods from the design: viewSaved(), displaySuccess(), displayError()
//
// Address: /customer/shortlist/:id   e.g. /customer/shortlist/5
//
// Flow: page opens -> GET /api/customer/shortlist/5
//   -> ViewShortlistC -> ShortlistItem entity -> project comes back -> details shown
//
// (How React pages work is explained at the top of SearchUserAccountPg.jsx.)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
// useCallback = keep the same function between redraws. useEffect = run code
// after drawing. useState = memory.
import { useCallback, useEffect, useState } from 'react';
// Link = a clickable link to another page. useParams = read :id from the address.
import { Link, useParams } from 'react-router-dom';
import { api } from '../api'; // calls the backend
import DetailsView from '../components/DetailsView'; // label: value list for one item
import Message from '../components/Message'; // red error box
import { statusLabel } from './userAccountShared'; // turns 'current' into 'Current'

// The details to show, top to bottom. key = field, label = text on the left.
const FIELDS = [
  { key: 'description', label: 'Description' }, // line 1
  { key: 'propertyType', label: 'Property type' }, // line 2
  { key: 'designStyle', label: 'Design style' }, // line 3
  { key: 'status', label: 'Status' }, // line 4
  { key: 'completionDate', label: 'Completion date' }, // line 5
  { key: 'designerName', label: 'Designer' }, // line 6
];

// =============================================================================
// FUNCTION: ViewShortlistPg (the page itself)
// WHAT IT DOES: draws one saved project and holds all its smaller functions.
// =============================================================================
export default function ViewShortlistPg() {
  // useParams reads :id from the address. For /customer/shortlist/5, id is "5".
  const { id } = useParams();

  // ---- State --------------------------------------------------------------------
  const [project, setProject] = useState(null); // the project; null until loaded
  const [loading, setLoading] = useState(true); // true while waiting for the backend
  const [error, setError] = useState(''); // red message

  // ---------------------------------------------------------------------------
  // FUNCTION: displaySuccess
  // WHAT IT DOES: shows the loaded project.
  // ---------------------------------------------------------------------------
  const displaySuccess = useCallback((found) => {
    setProject(found); // show the project
    setLoading(false); // hide "Loading..."
  }, []);

  // ---------------------------------------------------------------------------
  // FUNCTION: displayError
  // WHAT IT DOES: shows a red message when the project could not load.
  // ---------------------------------------------------------------------------
  const displayError = useCallback((message) => {
    // || gives a fallback message if the backend did not send one.
    setError(message || 'The project could not be loaded. Try again.');
    setLoading(false); // hide "Loading..."
  }, []);

  // ---------------------------------------------------------------------------
  // viewSaved: LOAD THE PROJECT
  // Runs when the page opens, and again if the ID in the address changes.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // "active" ignores a reply that arrives after the user has left the page.
    let active = true;
    api.get(`/customer/shortlist/${encodeURIComponent(id)}`) // GET /api/customer/shortlist/5
      // The reply arrived, so show the project.
      .then((found) => { if (active) displaySuccess(found); })
      // For a project not in this shortlist, the backend replies 404, and that
      // message is shown in the red box.
      .catch((err) => { if (active) displayError(err.message); });
    // The cleanup function (see "active" above).
    return () => { active = false; };
  }, [id, displaySuccess, displayError]);

  // Keep only the photos that have a web address. ?. and || [] cover "not loaded yet".
  const photos = (project?.images || []).filter((image) => image.url);

  // ---- What the page shows (JSX) --------------------------------------------------------
  return (
    // max-w-3xl limits the width so the details stay easy to read.
    <section className="grid max-w-3xl min-w-0 gap-6">
      {/* Link back to the list. */}
      <Link to="/customer/shortlist" className="text-sm text-action underline">Back to my shortlist</Link>

      {/* Show the project name once loaded; until then show 'Shortlisted project'. */}
      <h1 className="break-words text-3xl tracking-tight text-ink sm:text-4xl">{project ? project.name : 'Shortlisted project'}</h1>

      {/* Red message box (nothing shown when error is ''). */}
      <Message type="error" text={error} />

      {/* Shown only while loading. */}
      {loading && <p role="status" className="text-muted">Loading...</p>}

      {/* The details, once loaded. The outer <div> draws the white card. */}
      {project && (
        <div className="rounded-card border border-border bg-surface px-5 py-2">
          {/* item = a copy of the project with the status shown as 'Current' or 'Past'. */}
          <DetailsView fields={FIELDS} item={{ ...project, status: statusLabel(project.status) }} />
        </div>
      )}

      {/* The photos, if there are any. */}
      {photos.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {/* Draw one photo for each entry. "key" helps React track each photo. */}
          {photos.map((image) => (
            <li key={image.id}>
              {/* h-auto keeps the photo's own shape, so it is not cropped. */}
              <img src={image.url} alt={image.altText || `${project.name} photo`} loading="lazy" className="h-auto w-full rounded-card" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
} // End of ViewShortlistPg.
