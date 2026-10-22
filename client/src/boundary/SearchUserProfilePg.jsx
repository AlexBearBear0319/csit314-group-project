import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import ResultsTable from '../components/ResultsTable';
import SearchBar from '../components/SearchBar';
import { RecordLoadState } from '../components/RecordPanel';
import useRecordSearch from '../hooks/useRecordSearch';

export default function SearchUserProfilePg() {
  const navigate = useNavigate();
  const location = useLocation();
  const { keyword, rows, loading, error, search, retry } = useRecordSearch('/user-profiles');
  const open = (row, action = '') => navigate(`/admin/profiles/${row.id}${action}${location.search}`);
  return <section className="grid min-w-0 gap-6" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-4xl text-ink">User Profiles</h1>
      <Button type="button" onClick={() => navigate(`/admin/profiles/create${location.search}`)}>Create profile</Button>
    </div>
    <SearchBar key={keyword} initialKeyword={keyword} placeholder="Search user profiles" onSearch={search} />
    <RecordLoadState loading={loading} error={error} onRetry={retry} />
    {!loading && !error && <ResultsTable ariaLabel="User profiles" rows={rows}
      columns={[{ key: 'name', label: 'Profile name' }, { key: 'description', label: 'Description' }, { key: 'status', label: 'Status' }]}
      actions={[
        { label: 'View', onClick: (row) => open(row) },
        { label: 'Update', onClick: (row) => open(row, '/edit') },
        { label: 'Suspend', disabled: (row) => row.status === 'suspended', onClick: (row) => open(row, '/suspend') },
      ]} />}
  </section>;
}
