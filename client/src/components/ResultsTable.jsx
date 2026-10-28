// ResultsTable — shows search results with action buttons per row.
// Usage:
// <ResultsTable
//   columns={[{ key: 'username', label: 'Username' }, { key: 'status', label: 'Status' }]}
//   rows={accounts}
//   actions={[{ label: 'View', onClick: (row) => ... }, { label: 'Suspend', variant: 'danger', onClick: ... }]}
// />
// Optional per action: show: (row) => true/false. When given, the button only
// appears on rows where it returns true, e.g. Suspend only on active accounts:
//   { label: 'Suspend', show: (row) => row.rawStatus === 'active', onClick: ... }
// Actions without "show" appear on every row, as before.
import Button from './Button';

export default function ResultsTable({ columns, rows, actions = [], ariaLabel = 'Results' }) {
  if (!rows || rows.length === 0) {
    return (
      <p
        role="status"
        className="rounded-card border border-dashed border-border bg-surface px-5 py-12 text-center text-muted"
      >
        No results found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table aria-label={ariaLabel} className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="border-b border-border bg-canvas px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted"
              >
                {column.label}
              </th>
            ))}
            {actions.length > 0 && (
              <th scope="col" className="border-b border-border bg-canvas px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} className="border-b border-border px-4 py-3 text-ink">
                  {row[column.key]}
                </td>
              ))}
              {actions.length > 0 && (
                <td className="border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* .filter keeps only the actions to show on THIS row:
                        no "show" function means always show. Then .map draws
                        one button for each. */}
                    {actions.filter((action) => !action.show || action.show(row)).map((action) => (
                      <Button
                        key={action.label}
                        size="sm"
                        variant={action.variant || 'secondary'}
                        type="button"
                        disabled={typeof action.disabled === 'function' ? action.disabled(row) : action.disabled}
                        onClick={() => action.onClick(row)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
