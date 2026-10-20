// DetailsView — shows one item's details for VIEW stories.
// Usage: <DetailsView fields={[{ key: 'name', label: 'Name' }]} item={account} />
export default function DetailsView({ fields, item }) {
  if (!item) return null;
  return (
    <dl className="divide-y divide-border">
      {fields.map((field) => (
        <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4" key={field.key}>
          <dt className="text-sm font-medium text-muted">{field.label}</dt>
          <dd className="min-w-0 break-words text-base text-ink">{item[field.key] ?? '-'}</dd>
        </div>
      ))}
    </dl>
  );
}
