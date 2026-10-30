import { useEffect, useRef } from 'react';
import Button from './Button';
import DetailsView from './DetailsView';
import ProjectImageCarousel from './ProjectImageCarousel';

export default function ProjectPreviewDialog({ project, loading, error, onClose }) {
  const dialogRef = useRef(null);
  const projectId = project?.id;
  useEffect(() => {
    // showModal traps focus and makes the page behind it inactive. Depend on
    // the ID so loading the full record does not open the same dialog twice.
    if (!projectId) return undefined;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    dialog.querySelector('h2')?.focus();
    return () => {
      dialog.close();
      // Return keyboard users to the card that opened this dialog.
      if (previous?.isConnected) previous.focus();
    };
  }, [projectId]);

  return (
    <dialog ref={dialogRef} className="project-preview-dialog m-auto w-[min(96vw,72rem)] max-h-[92dvh] overflow-hidden rounded-panel border border-border bg-surface p-0 text-ink shadow-menu backdrop:bg-ink/45"
      aria-labelledby="studio-project-title" onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {project && <div className="max-h-[92dvh] overflow-y-auto">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/95 p-4 sm:px-6">
          <h2 id="studio-project-title" tabIndex={-1} className="min-w-0 break-words text-2xl">{project.name}</h2>
          <Button size="sm" variant="secondary" onClick={onClose} aria-label="Close project view">Close</Button>
        </header>
        {loading ? <p className="p-8 text-muted" role="status">Loading project.</p> : error ? <p className="p-8 text-danger" role="alert">{error}</p> :
          <div className={`grid gap-5 p-4 sm:p-6 ${project.images?.length ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(17rem,0.8fr)]' : ''}`}>
            <ProjectImageCarousel images={project.images || []} projectName={project.name} />
            <DetailsView item={project} fields={[
              { key: 'description', label: 'Description' }, { key: 'propertyType', label: 'Property type' },
              { key: 'designStyle', label: 'Design style' },
              ...(project.status === 'past' ? [{ key: 'completionDate', label: 'Completion date' }] : []),
            ]} />
          </div>}
      </div>}
    </dialog>
  );
}
