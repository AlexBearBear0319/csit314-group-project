import Button from './Button';

export default function ProjectPagination({ page, pagination, onPageChange }) {
  const { total, totalPages, pageSize } = pagination;
  // Show both ends and the current page's neighbours. The number of controls
  // stays small even when the server has hundreds of pages.
  const numbers = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((number) => number >= 1 && number <= totalPages).sort((a, b) => a - b);
  return (
    <nav aria-label="Project pages" className="grid gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total} projects
        </p>
        {totalPages > 1 && <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
          <span className="text-center text-sm text-ink">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>}
      </div>
      {totalPages > 1 && <div className="flex flex-wrap items-center justify-center gap-1" role="group" aria-label="Page numbers">
        {numbers.map((number, index) => <span key={number} className="inline-flex items-center gap-1">
          {index > 0 && number - numbers[index - 1] > 1 && <span className="px-1 text-muted" aria-hidden="true">…</span>}
          <Button size="sm" variant={number === page ? 'primary' : 'secondary'} className="min-w-10"
            aria-label={`Page ${number}`} aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}>{number}</Button>
        </span>)}
      </div>}
    </nav>
  );
}
