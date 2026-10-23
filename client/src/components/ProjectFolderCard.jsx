import { useRef } from 'react';
import Button from './Button';

function displayValue(value) {
  return value || '—';
}

export default function ProjectFolderCard({ project, past, onView, onEdit, onDelete }) {
  const moreRef = useRef(null);
  const moreButtonRef = useRef(null);
  const previews = (project.images || []).filter((image) => image.url).slice(0, 3);
  const imageCount = project.imageCount ?? project.images?.length ?? 0;

  function runAction(action) {
    moreRef.current?.removeAttribute('open');
    action();
  }

  function handleMenuKeyDown(event) {
    if (event.key === 'Escape' && moreRef.current?.open) {
      event.preventDefault();
      moreRef.current.open = false;
      moreButtonRef.current?.focus();
    }
  }

  return (
    <article className="min-w-0 rounded-panel border border-border bg-surface p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-menu motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative mb-4 pt-3">
        <span aria-hidden="true" className="absolute left-4 top-0 h-4 w-24 rounded-t-control border border-b-0 border-border bg-action-soft" />
        <span aria-hidden="true" className="absolute inset-x-2 bottom-0 top-5 rotate-[-3deg] rounded-card border border-border bg-action-soft/70" />
        <span aria-hidden="true" className="absolute inset-x-1 bottom-0 top-4 rotate-[2deg] rounded-card border border-border bg-canvas" />
        <button
          type="button"
          className="button-feedback group relative block aspect-[1.35/1] w-full overflow-hidden rounded-card border border-border bg-action-soft/50 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action"
          aria-label={`Open project ${project.name}`}
          onClick={() => onView(project)}
        >
          {previews.length > 0 ? (
            <>
              {previews.slice(1).map((image, index) => (
                <span
                  key={image.id}
                  aria-hidden="true"
                  className={`absolute inset-2 overflow-hidden rounded-card border border-white bg-white shadow-card ${index === 0 ? 'rotate-[-5deg]' : 'rotate-[5deg]'}`}
                >
                  <img src={image.url} alt="" className="size-full object-cover" />
                </span>
              ))}
              <img
                src={previews[0].url}
                alt=""
                className="absolute inset-2 size-[calc(100%-1rem)] rounded-card object-cover shadow-card transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
              />
            </>
          ) : (
            <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-action">
              <svg viewBox="0 0 96 72" fill="none" className="w-1/2 max-w-28" aria-hidden="true">
                <path d="M8 19a7 7 0 0 1 7-7h23l8 9h35a7 7 0 0 1 7 7v27a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7V19Z" fill="currentColor" opacity=".18" />
                <path d="M8 26a7 7 0 0 1 7-7h66a7 7 0 0 1 7 7v29a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7V26Z" fill="currentColor" opacity=".72" />
                <path d="M14 29h68v25H14z" fill="white" opacity=".45" />
              </svg>
            </span>
          )}
          <span className="absolute bottom-2 right-2 rounded-control bg-ink/85 px-2.5 py-1 text-xs font-medium text-white">
            {imageCount} {imageCount === 1 ? 'image' : 'images'}
          </span>
        </button>
      </div>

      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 break-words text-lg font-semibold leading-snug text-ink">
          {project.name}
        </h2>
        <details ref={moreRef} className="relative shrink-0" onKeyDown={handleMenuKeyDown}>
          <summary
            ref={moreButtonRef}
            aria-label={`More actions for ${project.name}`}
            className="grid min-h-10 min-w-10 cursor-pointer list-none place-items-center rounded-control border border-border bg-surface px-2 text-sm font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden"
          >
            <span>More</span>
          </summary>
          <div className="absolute right-0 top-12 z-20 grid min-w-36 gap-1 rounded-card border border-border bg-surface p-1.5 shadow-menu">
            <button type="button" className="button-feedback min-h-10 rounded-control px-3 text-left text-sm text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-action" onClick={() => runAction(() => onView(project))}>View</button>
            <button type="button" className="button-feedback min-h-10 rounded-control px-3 text-left text-sm text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-action" onClick={() => runAction(() => onEdit(project))}>Edit</button>
            <button type="button" className="button-feedback min-h-10 rounded-control px-3 text-left text-sm text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-danger" onClick={() => runAction(() => onDelete(project, moreButtonRef.current))}>Delete</button>
          </div>
        </details>
      </div>

      <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-sm">
        <div className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] gap-2">
          <dt className="text-muted">Property type</dt>
          <dd className="min-w-0 break-words text-ink">{displayValue(project.propertyType)}</dd>
        </div>
        <div className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] gap-2">
          <dt className="text-muted">Design style</dt>
          <dd className="min-w-0 break-words text-ink">{displayValue(project.designStyle)}</dd>
        </div>
        {past && (
          <div className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] gap-2">
            <dt className="text-muted">Completed</dt>
            <dd className="min-w-0 break-words text-ink">{displayValue(project.completionDate)}</dd>
          </div>
        )}
      </dl>

      <Button type="button" variant="secondary" size="sm" className="mt-4 w-full" onClick={() => onView(project)}>
        View project
      </Button>
    </article>
  );
}
