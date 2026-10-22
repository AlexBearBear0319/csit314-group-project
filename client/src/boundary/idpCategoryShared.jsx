import RecordPanel from '../components/RecordPanel';

export function CategoryPanel({ title, children }) {
  return <RecordPanel title={title} listPath="/manager/categories" backLabel="Back to IDP categories">
    {children}
  </RecordPanel>;
}
