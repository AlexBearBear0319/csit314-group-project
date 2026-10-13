// ResultsTable — shows search results with action buttons per row.
// Usage:
// <ResultsTable
//   columns={[{ key: 'username', label: 'Username' }, { key: 'status', label: 'Status' }]}
//   rows={accounts}
//   actions={[{ label: 'View', onClick: (row) => ... }, { label: 'Suspend', variant: 'danger', onClick: ... }]}
// />
export default function ResultsTable({ columns, rows, actions = [] }) {
  if (!rows || rows.length === 0) return <p className="text-muted">No results found.</p>;
  return (
    <table className="table table-striped align-middle">
      <thead>
        <tr>
          {columns.map((c) => <th key={c.key}>{c.label}</th>)}
          {actions.length > 0 && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => <td key={c.key}>{row[c.key]}</td>)}
            {actions.length > 0 && (
              <td className="d-flex gap-2">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    className={`btn btn-sm btn-${a.variant || 'secondary'}`}
                    onClick={() => a.onClick(row)}
                  >
                    {a.label}
                  </button>
                ))}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
