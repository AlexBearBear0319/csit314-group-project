import RecordPanel, { RecordLoadState } from '../components/RecordPanel';

export function ProfilePanel({ title, children }) {
  return (
    <RecordPanel title={title} listPath="/admin/profiles" backLabel="Back to user profiles">
      {children}
    </RecordPanel>
  );
}

export function ProfileLoadState(props) {
  return <RecordLoadState {...props} />;
}
