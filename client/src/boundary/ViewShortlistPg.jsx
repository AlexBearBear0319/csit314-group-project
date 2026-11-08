// =============================================================================
// BOUNDARY: ViewShortlistPg
// Story: "As a Customer, I want to view my shortlist so that I can see all the
// IDPs I have saved."
// Methods from the design: viewShortlist(), viewSaved(), displaySuccess(), displayError()
//
// Address: /customer/shortlist  ("My Shortlist" in the Customer menu)
// The page opens with everything the Customer saved, latest save at the top.
// View on a row opens the same pop-up that Search IDPs uses.
//
// Flow: page opens -> GET /api/customer/shortlist
//   -> ViewShortlistC -> ShortlistItem entity -> table is filled
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Button from '../components/Button';
import Message from '../components/Message';
import ProjectPreviewDialog from '../components/ProjectPreviewDialog';
import ResultsTable from '../components/ResultsTable';
import SearchShortlistPg from './SearchShortlistPg';
import { statusLabel } from './userAccountShared'; // turns 'current' into 'Current'

// The table's columns. key = the field in each project, label = the heading.
const COLUMNS = [
  { key: 'name', label: 'Project name' },
  { key: 'propertyType', label: 'Property type' },
  { key: 'designStyle', label: 'Design style' },
  { key: 'status', label: 'Status' },
];

export default function ViewShortlistPg() {
  const navigate = useNavigate();

  // The list
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The search box waits for the first load, so the two can never race.
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  // The pop-up
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef(0); // counts requests so a late reply can be ignored

  function displaySuccess(list) {
    setProjects(list);
    setError('');
    setLoading(false);
    setFirstLoadDone(true);
  }

  function displayError(message) {
    setError(message || 'Your shortlist could not be loaded. Try again.');
    setLoading(false);
    setFirstLoadDone(true);
  }

  // viewShortlist: load everything the Customer saved when the page opens.
  useEffect(() => {
    let active = true; // stops a late reply from touching a page that has closed
    api.get('/customer/shortlist')
      .then((list) => { if (active) displaySuccess(list); })
      .catch((failure) => { if (active) displayError(failure.message); });
    return () => { active = false; };
  }, []);

  // viewSaved: open the pop-up straight away, then fill in the full details.
  async function viewSaved(row) {
    const request = ++detailRequest.current;
    setSelected({ id: row.id, name: row.name });
    setDetailLoading(true);
    setDetailError('');
    try {
      const details = await api.get(`/customer/shortlist/${row.id}`);
      if (request === detailRequest.current) setSelected(details);
    } catch (failure) {
      if (request === detailRequest.current) setDetailError(failure.message);
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }

  function closeDetails() {
    detailRequest.current += 1; // anything still on its way is now out of date
    setSelected(null);
    setDetailLoading(false);
    setDetailError('');
  }

  // The same projects, with the status turned into 'Current' or 'Past'.
  const rows = projects.map((project) => ({ ...project, status: statusLabel(project.status) }));

  return (
    <section className="grid min-w-0 gap-6" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">My Shortlist</h1>
        {/* Projects are saved from Search IDPs, so this takes the Customer there. */}
        <Button type="button" onClick={() => navigate('/customer/search')}>Find projects to save</Button>
      </div>

      <Message type="error" text={error} />

      {firstLoadDone && (
        <SearchShortlistPg
          onSearchStart={() => { setLoading(true); setError(''); }}
          onResults={displaySuccess}
          onSearchFail={displayError}
        />
      )}

      {loading
        ? <p role="status" className="text-muted">Loading your shortlist...</p>
        : !error && (
          <ResultsTable
            ariaLabel="My shortlist"
            columns={COLUMNS}
            rows={rows}
            actions={[{ label: 'View', onClick: viewSaved }]}
          />
        )}

      <ProjectPreviewDialog project={selected} loading={detailLoading} error={detailError} onClose={closeDetails} showDesigner />
    </section>
  );
}
