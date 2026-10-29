import { useRef, useState } from 'react';

function CarouselImage({ image, alt }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!image.url || failed) return <div className="grid size-full place-items-center p-5 text-sm text-muted" role="status">This photo is unavailable.</div>;
  return <>
    {!loaded && <span className="absolute inset-0 grid place-items-center text-sm text-muted" role="status">Loading photo.</span>}
    <img src={image.url} alt={alt} className="carousel-photo size-full object-contain"
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={{ opacity: loaded ? 1 : 0 }} />
  </>;
}

export default function ProjectImageCarousel({ images = [], projectName, initialIndex = 0 }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const touchStartRef = useRef(null);
  const imageCount = images.length;
  const safeIndex = Math.min(activeIndex, Math.max(0, imageCount - 1));
  const image = images[safeIndex];

  if (!imageCount) return null;

  function moveBy(offset) {
    setActiveIndex((current) => ((current + offset) % imageCount + imageCount) % imageCount);
  }

  function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    moveBy(deltaX < 0 ? 1 : -1);
  }

  return (
    <section className="grid min-w-0 gap-3" aria-label={`${projectName} photos`} aria-roledescription="carousel"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          moveBy(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}>
      <figure className="min-w-0 overflow-hidden rounded-card border border-border bg-surface">
        <div
          className="relative h-[min(52dvh,32rem)] min-h-44 overflow-hidden bg-surface-hover [touch-action:pan-y_pinch-zoom]"
          role="group"
          tabIndex={0}
          aria-label={`${projectName} photo viewer`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => { touchStartRef.current = null; }}
        >
          <CarouselImage key={image.id || image.url || safeIndex} image={image} alt={image.altText || `${projectName} photo ${safeIndex + 1}`} />
        </div>
          {imageCount > 1 && (
            <div className="flex min-w-0 items-center gap-2 border-y border-border bg-surface p-2 text-ink">
              <button
                type="button"
                className="button-feedback grid size-11 shrink-0 place-items-center rounded-control border border-border bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                onClick={() => moveBy(-1)}
                aria-label="Previous photo"
              >
                <span aria-hidden="true" className="text-xl leading-none">←</span>
              </button>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto" role="group" aria-label="Choose a photo">
                {images.map((item, index) => (
                  <button
                    key={item.id || `${item.fileName}-${index}`}
                    type="button"
                    className="button-feedback grid size-11 shrink-0 place-items-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show photo ${index + 1} of ${imageCount}`}
                    aria-pressed={safeIndex === index}
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${safeIndex === index ? 'w-5 bg-action' : 'w-2 bg-muted/40'}`}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="button-feedback grid size-11 shrink-0 place-items-center rounded-control border border-border bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                onClick={() => moveBy(1)}
                aria-label="Next photo"
              >
                <span aria-hidden="true" className="text-xl leading-none">→</span>
              </button>
            </div>
          )}
        <figcaption className="flex min-w-0 items-start justify-between gap-3 px-3 py-2.5">
          <span className="break-words text-sm text-muted">{image.altText || image.fileName}</span>
          <span className="shrink-0 text-xs text-muted" aria-hidden="true">{safeIndex + 1} / {imageCount}</span>
        </figcaption>
      </figure>

      {imageCount > 1 && (
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Photo {safeIndex + 1} of {imageCount}: {image.altText || image.fileName}
        </span>
      )}
    </section>
  );
}
