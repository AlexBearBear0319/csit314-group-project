import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Button from '../components/Button';
import Message from '../components/Message';
import StudioMotion from '../components/StudioMotion';
import ProjectPreviewDialog from '../components/ProjectPreviewDialog';
import RecentProjectCard from '../components/RecentProjectCard';

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DesignerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState(null);
  const detailRequest = useRef(null);

  useEffect(() => {
    // The list API returns totals and a page of recent projects. Read both
    // collections together; do not count only the visible cards.
    const controller = new AbortController();
    Promise.all(['current', 'past'].map(async (status) => {
      // Collection pages default to FIFO. Recent work must use edit time.
      const result = await api.get(`/designer/${status}-idps?page=1&sort=recent`, { signal: controller.signal });
      return { ...result, projects: result.projects.map((project) => ({ ...project, status })) };
    })).then(([current, past]) => {
      if (controller.signal.aborted) return;
      setData({ current, past, recent: [...current.projects, ...past.projects]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id).slice(0, 4) });
    }).catch((requestError) => { if (!controller.signal.aborted) setError(requestError.message); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => () => detailRequest.current?.abort(), []);

  async function showProject(project) {
    // Cancel the old request so a late response cannot replace a new selection.
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setView({ project, loading: true });
    try {
      const result = await api.get(`/designer/${project.status}-idps/${project.id}`, { signal: controller.signal });
      if (!controller.signal.aborted) setView({ project: result.project, loading: false });
    } catch (requestError) {
      if (!controller.signal.aborted) setView({ project, loading: false, error: requestError.message });
    }
  }

  function closeProject() {
    // A response must not reopen a dialog after the user closes it.
    detailRequest.current?.abort();
    setView(null);
  }

  return (
    <section className="studio-dashboard">
      <div className="studio-title-row">
        <h1>Design studio<span aria-hidden="true">.</span></h1>
        <Link className="studio-primary-link button-feedback" to="/designer/current-idps">Current projects <Arrow /></Link>
      </div>
      <div className="studio-overview">
        <StudioMotion />
        <div className="studio-collections">
          {error ? <div className="studio-error"><Message type="error" text={error} /><Button variant="secondary" onClick={() => { setError(''); setAttempt((value) => value + 1); }}>Try again</Button></div> :
            ['current', 'past'].map((status, index) => (
              <Link key={status} to={`/designer/${status}-idps`} className={`studio-collection studio-collection-${status}`}>
                <span className="studio-collection-top"><span className="studio-index">0{index + 1}</span><Arrow /></span>
                <span className="studio-count" aria-label={data ? `${data[status].pagination.total} projects` : 'Loading project count'}>{data ? String(data[status].pagination.total).padStart(2, '0') : '—'}</span>
                <span className="studio-collection-name">{status === 'current' ? 'Current projects' : 'Past projects'}</span>
                <svg className="studio-collection-drawing" viewBox="0 0 180 180" fill="none" aria-hidden="true"><path d={index === 0 ? 'M35 160V72a55 55 0 0 1 110 0v88ZM90 18v142M35 90h110M35 125h110' : 'M25 160V65h130v95ZM45 65V30h90v35M25 100h130M70 65v95M115 65v95'} stroke="currentColor" strokeWidth="1" /></svg>
              </Link>
            ))}
        </div>
      </div>
      <section aria-labelledby="recent-projects-title">
        <div className="studio-section-heading"><h2 id="recent-projects-title">Recent projects</h2><Link to="/designer/past-idps">Past projects <Arrow /></Link></div>
        {!data && !error && <p role="status" className="py-8 text-muted">Loading projects.</p>}
        {data && data.recent.length === 0 && <div className="studio-empty"><p>No projects yet.</p><Link to="/designer/current-idps">Add a project <Arrow /></Link></div>}
        {data && <div className="studio-project-grid">{data.recent.map((project, index) => (
          <RecentProjectCard key={project.id} project={project} index={index} onView={showProject} />
        ))}</div>}
      </section>
      <ProjectPreviewDialog project={view?.project} loading={view?.loading} error={view?.error} onClose={closeProject} />
    </section>
  );
}
