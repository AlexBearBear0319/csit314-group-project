import { useState } from 'react';
import Button from './Button';

function imageSize(sizeBytes) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectImageCarousel({ images, projectName }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imageCount = images.length;
  const safeIndex = Math.min(activeIndex, Math.max(0, imageCount - 1));
  const image = images[safeIndex];

  if (!imageCount) return null;

  function moveBy(offset) {
    setActiveIndex((current) => (Math.min(current, imageCount - 1) + offset + imageCount) % imageCount);
  }

  return (
    <section className="mt-5 grid gap-3" aria-label={`${projectName} photos`}>
      <figure className="overflow-hidden rounded-card border border-border bg-white">
        {image.url ? (
          <img
            src={image.url}
            alt={image.altText || `${projectName} photo ${safeIndex + 1}`}
            className="aspect-[4/3] w-full bg-canvas object-contain"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center bg-canvas text-sm text-muted">Preview unavailable</div>
        )}
        <figcaption className="grid gap-1 p-3">
          <span className="break-all text-sm font-medium text-ink">{image.fileName}</span>
          <span className="text-xs text-muted">{image.altText} · {imageSize(image.sizeBytes)}</span>
        </figcaption>
      </figure>

      {imageCount > 1 && (
        <div className="flex items-center justify-between gap-3" role="group" aria-label="Photo controls">
          <Button size="sm" variant="secondary" onClick={() => moveBy(-1)} aria-label="Previous photo">
            <span aria-hidden="true">←</span>
            <span>Previous</span>
          </Button>
          <span className="min-w-16 text-center text-sm text-muted" aria-hidden="true">
            {safeIndex + 1} / {imageCount}
          </span>
          <span className="sr-only" role="status" aria-live="polite">
            Photo {safeIndex + 1} of {imageCount}: {image.altText || image.fileName}
          </span>
          <Button size="sm" variant="secondary" onClick={() => moveBy(1)} aria-label="Next photo">
            <span>Next</span>
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      )}
    </section>
  );
}
