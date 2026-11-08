import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Button from '../components/Button';
import FormField from '../components/FormField';
import ProjectPreviewDialog from '../components/ProjectPreviewDialog';
import SaveShortlistPg from './SaveShortlistPg';

// BCE boundary for listing, sorting and opening ongoing projects (#33).
// Every project card has a Save button, and so does the pop-up (#34).
export default function OngoingIDPPage({ IDPList, pagination, sort, onPageChange, onSortChange, savedIds, onSaved }) {
  const [selectedIDP, setSelectedIDP] = useState(null); // the project open in the pop-up
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const detailRequest = useRef(0); // counts requests so a late reply can be ignored
  const pendingProject = useRef(null);

  useEffect(() => () => { detailRequest.current += 1; }, []);

  // Opens the pop-up straight away, then fills in the full details.
  async function displayIDPDetails(project) {
    if (pendingProject.current === project.id) return;
    const request = ++detailRequest.current;
    pendingProject.current = project.id;
    setSelectedIDP(project);
    setIsLoading(true);
    setError('');
    try {
      const details = await api.post(`/customer/idps/${project.id}/view`, {});
      if (request === detailRequest.current) setSelectedIDP(details);
    } catch (failure) {
      if (request === detailRequest.current) displayErrorMessage(failure);
    } finally {
      if (request === detailRequest.current) {
        pendingProject.current = null;
        setIsLoading(false);
      }
    }
  }

  function displayErrorMessage(failure) {
    setError(failure.message);
  }

  function closeDetails() {
    detailRequest.current += 1;
    pendingProject.current = null;
    setSelectedIDP(null);
    setIsLoading(false);
    setError('');
  }

  function sortIDP(event) {
    onSortChange(event.target.value);
  }

  // The shortlist button for one project. The cards and the pop-up both use it.
  function displaySaveButton(project) {
    return <SaveShortlistPg project={project} saved={savedIds.has(project.id)} onSaved={onSaved} />;
  }

  function displayOngoingIDPList() {
    if (!IDPList.length) return <p role="status">No results found.</p>;
    return (
      <div className="grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {IDPList.map(project => (
          <article key={project.id} className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="break-words font-display text-2xl">{project.name}</h2>
            <dl className="grid gap-2">
              <div>
                <dt className="text-sm text-muted">Property type</dt>
                <dd className="break-words">{project.propertyType || 'Unspecified'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Design style</dt>
                <dd className="break-words">{project.designStyle || 'Unspecified'}</dd>
              </div>
            </dl>
            <div className="grid gap-2 self-end">
              <Button type="button" variant="secondary" onClick={() => displayIDPDetails(project)}>
                View project
              </Button>
              {displaySaveButton(project)}
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xs">
        <FormField id="customer-project-sort" label="Sort projects" value={sort} onChange={sortIDP} includeEmptyOption={false}
          options={[
            { value: 'date', label: 'Newest first' },
            { value: 'fifo', label: 'Oldest first' },
            { value: 'alphabetical', label: 'Name A–Z' },
          ]} />
      </div>
      {displayOngoingIDPList()}
      <nav aria-label="Project pages" className="flex flex-wrap items-center gap-4">
        <Button type="button" variant="secondary" disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}>Previous</Button>
        <span role="status">
          {pagination.total > 0
            ? `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} projects`
            : '0 projects'}
        </span>
        <Button type="button" variant="secondary" disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}>Next</Button>
      </nav>
      <ProjectPreviewDialog project={selectedIDP} loading={isLoading} error={error}
        onClose={closeDetails} showDesigner actions={selectedIDP && displaySaveButton(selectedIDP)} />
    </>
  );
}
