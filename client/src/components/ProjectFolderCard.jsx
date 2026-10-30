import { useEffect, useId, useRef, useState } from 'react';
import Button from './Button';
import useProjectImages from '../useProjectImages';

function displayValue(value) {
  return value || '—';
}

function filePosition(index, count) {
  const slot = index - (count - 1) / 2;
  return {
    '--project-file-x': `${slot * 3.25}rem`,
    '--project-file-rotation': `${slot * 11}deg`,
    '--project-file-delay': `${index * 45}ms`,
    zIndex: index + 1,
  };
}

export default function ProjectFolderCard({ project, past, onView, onEdit, onDelete, appearDelay = 0, isEditing = false }) {
  const photos = useProjectImages({ projectId: project.id, status: past ? 'past' : 'current', images: project.images });
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasEntered, setHasEntered] = useState(() => typeof IntersectionObserver === 'undefined');
  const cardRef = useRef(null);
  const folderRef = useRef(null);
  const folderButtonRef = useRef(null);
  const fileListRef = useRef(null);
  const moreRef = useRef(null);
  const moreButtonRef = useRef(null);
  const menuRef = useRef(null);
  const filesId = useId().replace(/:/g, '');
  const previews = photos.images.filter((image) => image.url).slice(0, 3);
  const imageCount = project.imageCount ?? project.images?.length ?? 0;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;

    let delayTimer;
    // Start the entrance once, when the card first enters the viewport.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      delayTimer = window.setTimeout(() => setHasEntered(true), appearDelay);
    }, { threshold: 0.15 });
    observer.observe(card);

    return () => {
      observer.disconnect();
      window.clearTimeout(delayTimer);
    };
  }, [appearDelay]);

  useEffect(() => {
    const folder = folderRef.current;
    if (!folder) return undefined;

    let frame = 0;
    let rotateX = '0deg';
    let rotateY = '0deg';
    const applyTilt = () => {
      frame = 0;
      folder.style.setProperty('--project-folder-rotate-x', rotateX);
      folder.style.setProperty('--project-folder-rotate-y', rotateY);
    };
    // Write CSS variables once per animation frame instead of setting React
    // state on each pointer move. Touch and reduced-motion users skip tilt.
    const onPointerMove = (event) => {
      if (event.pointerType === 'touch') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const bounds = folder.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
      rotateX = `${(-y * 4).toFixed(2)}deg`;
      rotateY = `${(x * 5).toFixed(2)}deg`;
      if (!frame) frame = window.requestAnimationFrame(applyTilt);
    };
    const onPointerLeave = () => {
      rotateX = '0deg';
      rotateY = '0deg';
      if (!frame) frame = window.requestAnimationFrame(applyTilt);
    };

    folder.addEventListener('pointermove', onPointerMove);
    folder.addEventListener('pointerleave', onPointerLeave);
    return () => {
      folder.removeEventListener('pointermove', onPointerMove);
      folder.removeEventListener('pointerleave', onPointerLeave);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isOpen && !isMenuOpen) return undefined;

    const closeMenu = () => {
      if (moreRef.current?.open) moreRef.current.open = false;
      setIsMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (isMenuOpen) {
        closeMenu();
        moreButtonRef.current?.focus();
      } else if (isOpen) {
        setIsOpen(false);
        folderButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (isOpen && !cardRef.current?.contains(event.target)) setIsOpen(false);
      if (isMenuOpen && !moreRef.current?.contains(event.target)) closeMenu();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen, isMenuOpen]);

  function runAction(action) {
    if (moreRef.current?.open) moreRef.current.open = false;
    setIsMenuOpen(false);
    action();
  }

  function handleMenuKeyDown(event) {
    // Use arrows, Home and End to move through the menu. Escape closes it
    // and returns focus to More actions. All actions work without a mouse.
    if (!moreRef.current?.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      moreRef.current.open = false;
      setIsMenuOpen(false);
      moreButtonRef.current?.focus();
      return;
    }

    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    if (!items.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1) % items.length
          : (currentIndex <= 0 ? items.length - 1 : currentIndex - 1);
    items[nextIndex].focus();
  }

  return (
    <article
      ref={cardRef}
      className="project-folder-card group min-w-0 rounded-panel border border-border bg-surface p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-menu motion-reduce:transform-none motion-reduce:transition-none"
    >
      <h2 className="sr-only">{project.name}</h2>

      <div
        ref={folderRef}
        className="project-folder-frame relative mb-4"
        data-open={isOpen ? 'true' : 'false'}
        data-entered={hasEntered ? 'true' : 'false'}
      >
        <div className="project-folder-stage">
          <span className="project-folder-tab" aria-hidden="true" />
          <div className="project-folder-back" aria-hidden="true">
            {previews[0]?.url ? (
              <img key={`${previews[0].url}:${photos.revision}`} src={previews[0].url} alt="" className="project-folder-art" loading="lazy" onError={() => photos.refreshImages()} />
            ) : (
              <svg viewBox="0 0 96 72" fill="none" className="project-folder-empty-art" aria-hidden="true">
                <path d="M8 19a7 7 0 0 1 7-7h23l8 9h35a7 7 0 0 1 7 7v27a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7V19Z" fill="currentColor" opacity=".18" />
                <path d="M8 26a7 7 0 0 1 7-7h66a7 7 0 0 1 7 7v29a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7V26Z" fill="currentColor" opacity=".72" />
              </svg>
            )}
          </div>

          <div
            id={filesId}
            ref={fileListRef}
            className="project-folder-files"
            role="list"
            aria-label={`${project.name} photos`}
            aria-hidden={!isOpen}
            inert={!isOpen}
          >
            {previews.length ? previews.map((image, index) => (
              <div
                key={image.id || `${image.fileName}-${index}`}
                className="project-folder-file-slot"
                style={filePosition(index, previews.length)}
                role="listitem"
              >
                <button
                  type="button"
                  className="project-folder-file button-feedback focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                  aria-label={`View ${image.fileName || `project photo ${index + 1}`}`}
                  onClick={(event) => onView(project, event.currentTarget, image.id)}
                >
                  <img key={`${image.url}:${photos.revision}`} src={image.url} alt="" className="project-folder-file-image" onError={() => photos.refreshImages()} />
                  <span className="project-folder-file-name">{image.fileName || `Photo ${index + 1}`}</span>
                </button>
              </div>
            )) : (
              <div className="project-folder-empty-message" role="listitem">No photo previews</div>
            )}
          </div>

          <button
            ref={folderButtonRef}
            type="button"
            className="project-folder-front button-feedback focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action"
            aria-label={`${isOpen ? 'Close' : 'Open'} photo folder for ${project.name}`}
            aria-expanded={isOpen}
            aria-controls={filesId}
            onClick={() => setIsOpen((current) => !current)}
          >
            <span className="project-folder-glass" aria-hidden="true" />
            <span className="project-folder-label" aria-hidden="true">
              <span className="project-folder-name">{project.name}</span>
              <span className="project-folder-meta">{imageCount} {imageCount === 1 ? 'image' : 'images'}</span>
            </span>
          </button>

          <button
            type="button"
            className="project-folder-key button-feedback focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
            aria-label={`Add photos to ${project.name}`}
            title="Open the project editor to add photos."
            disabled={isEditing}
            aria-busy={isEditing || undefined}
            onClick={() => {
              setIsOpen(false);
              onEdit(project);
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      {photos.refreshing && <p role="status" className="mb-3 text-xs text-muted">Refreshing photos.</p>}
      {photos.unavailable && <Button variant="secondary" size="sm" className="mb-3" onClick={() => photos.refreshImages(true)}>Retry photos</Button>}
      <div className="flex items-center justify-between gap-2">
        <span className="gallery-status">{past ? 'Past project' : 'Current project'}</span>
        <details
          ref={moreRef}
          className="relative shrink-0"
          onToggle={(event) => setIsMenuOpen(event.currentTarget.open)}
          onKeyDown={handleMenuKeyDown}
        >
          <summary
            ref={moreButtonRef}
            aria-label={`More actions for ${project.name}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="grid min-h-10 min-w-10 cursor-pointer list-none place-items-center rounded-control border border-border bg-surface px-2 text-xl leading-none text-ink transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden"
          >
            <span aria-hidden="true">···</span>
          </summary>
          <div
            ref={menuRef}
            role="menu"
            aria-label={`${project.name} options`}
            className="absolute right-0 top-12 z-20 grid min-w-44 gap-1 rounded-card border border-border bg-surface/90 p-1.5 shadow-menu backdrop-blur-lg"
          >
            <button type="button" role="menuitem" className="button-feedback min-h-10 rounded-control px-3 text-left text-sm text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-action" onClick={() => runAction(() => setIsOpen((current) => !current))}>
              {isOpen ? 'Close photo folder' : 'Open photo folder'}
            </button>
            <button type="button" role="menuitem" className="button-feedback min-h-10 rounded-control px-3 text-left text-sm text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-action" onClick={() => runAction(() => onView(project, moreButtonRef.current))}>View project</button>
            <button type="button" role="menuitem" disabled={isEditing} className="button-feedback min-h-10 rounded-control px-3 text-left text-sm text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-action" onClick={() => runAction(() => onEdit(project))}>Edit project</button>
            <button type="button" role="menuitem" className="button-feedback min-h-10 rounded-control px-3 text-left text-sm text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-danger" onClick={() => runAction(() => onDelete(project, moreButtonRef.current))}>Delete project</button>
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

      <Button type="button" variant="secondary" size="sm" className="mt-4 w-full" onClick={(event) => onView(project, event.currentTarget)}>
        View project <span aria-hidden="true">↗</span>
      </Button>
      {isEditing && <p className="mt-2 text-xs text-muted" role="status">Opening editor.</p>}
    </article>
  );
}
