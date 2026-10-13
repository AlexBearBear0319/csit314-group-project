// DetailsView — shows one item's details for VIEW stories.
// Usage: <DetailsView fields={[{ key: 'name', label: 'Name' }]} item={account} />
export default function DetailsView({ fields, item }) {
  if (!item) return null;
  return (
    <dl className="row">
      {fields.map((f) => (
        <div className="contents" key={f.key} style={{ display: 'contents' }}>
          <dt className="col-sm-3">{f.label}</dt>
          <dd className="col-sm-9">{item[f.key] ?? '-'}</dd>
        </div>
      ))}
    </dl>
  );
}
