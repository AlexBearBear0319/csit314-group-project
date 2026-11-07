import { useState } from 'react';
import Button from './Button';

export default function ProjectPhoto({ image, alt, refreshing, onUnavailable, onRetry, allowRetry = true }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (refreshing || !image.url || failed) return (
    <span className="grid size-full content-center justify-items-center gap-3 p-3 text-center text-sm text-muted">
      <span role="status">{refreshing ? 'Refreshing photo.' : 'This photo is unavailable.'}</span>
      {!refreshing && allowRetry && onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry photo</Button>}
    </span>
  );
  return <>
    {!loaded && <span className="absolute inset-0 grid place-items-center text-sm text-muted" role="status">Loading photo.</span>}
    <img src={image.url} alt={alt} className="carousel-photo size-full object-contain"
      onLoad={() => setLoaded(true)} onError={() => { setFailed(true); onUnavailable?.(); }} style={{ opacity: loaded ? 1 : 0 }} />
  </>;
}
