import { useRef, useState } from 'react';

function imageSize(sizeBytes) {
  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    moveBy(deltaX < 0 ? 1 : -1);
  }

  const metadata = [image.altText, imageSize(image.sizeBytes)].filter(Boolean).join(' · ');

  return (
    <section className="grid min-w-0 gap-3" aria-label={`${projectName} photos`}>
      <figure className="min-w-0 overflow-hidden rounded-card border border-border bg-surface">
        <div
          className="relative h-[min(62dvh,42rem)] min-h-44 overflow-hidden rounded-card bg-ink [touch-action:pan-y_pinch-zoom]"
          role="group"
          aria-label={`${projectName} photo viewer`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => { touchStartRef.current = null; }}
        >
          {image.url ? (
            <img
              key={image.id || image.url}
              src={image.url}
              alt={image.altText || `${projectName} photo ${safeIndex + 1}`}
              className="size-full object-contain"
            />
          ) : (
            <div className="grid size-full place-items-center px-4 text-center text-sm text-white">
              Preview unavailable
            </div>
          )}

          {imageCount > 1 && (
            <div className="absolute inset-x-3 bottom-3 flex min-w-0 items-center gap-2 rounded-control border border-white/25 bg-ink/75 p-1.5 text-white shadow-menu backdrop-blur-sm">
              <button
                type="button"
                className="button-feedback grid size-10 shrink-0 place-items-center rounded-control border border-border bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
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
                    className="button-feedback grid size-9 shrink-0 place-items-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show photo ${index + 1} of ${imageCount}`}
                    aria-pressed={safeIndex === index}
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${safeIndex === index ? 'w-5 bg-white' : 'w-2 bg-white/55'}`}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="button-feedback grid size-10 shrink-0 place-items-center rounded-control border border-border bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                onClick={() => moveBy(1)}
                aria-label="Next photo"
              >
                <span aria-hidden="true" className="text-xl leading-none">→</span>
              </button>
            </div>
          )}
        </div>

        <figcaption className="grid min-w-0 gap-0.5 px-3 py-2.5">
          <span className="break-all text-sm font-medium text-ink">{image.fileName}</span>
          {metadata && <span className="break-words text-xs text-muted">{metadata}</span>}
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
