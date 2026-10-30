import useProjectImages from '../useProjectImages';
import Button from './Button';

export default function RecentProjectCard({ project, index, onView }) {
  const photos = useProjectImages({ projectId: project.id, status: project.status, images: project.images });
  const cover = photos.images.find((image) => image.url);
  return <article className="min-w-0">
    <button type="button" className="studio-project-card w-full" onClick={() => onView(project)} aria-label={`View ${project.name}`}>
      <span className="studio-project-cover">
        <svg viewBox="0 0 320 240" fill="none" aria-hidden="true"><path d="M80 210V103a80 80 0 0 1 160 0v107ZM160 25v185M80 130h160" stroke="currentColor" /><path d="m40 240 120-30 120 30M80 210h160" stroke="currentColor" /></svg>
        {cover && <img key={`${cover.url}:${photos.revision}`} src={cover.url} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; photos.refreshImages(); }} />}
        <span className="studio-project-tag">{project.status === 'past' ? 'Past' : 'Current'}</span>
        <span className="studio-project-open" aria-hidden="true">↗</span>
      </span>
      <span className="studio-project-caption"><span className="studio-index">0{index + 1}</span><span className="min-w-0"><span className="studio-project-name">{project.name}</span><span className="studio-project-style">{[project.propertyType, project.designStyle].filter(Boolean).join(' · ')}</span></span></span>
    </button>
    {photos.refreshing && <p role="status" className="text-xs text-muted">Refreshing photos.</p>}
    {photos.unavailable && <Button size="sm" variant="secondary" onClick={() => photos.refreshImages(true)}>Retry photos</Button>}
  </article>;
}
