import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Message from '../components/Message';
import ResultsTable from '../components/ResultsTable';
import SearchBar from '../components/SearchBar';
import { RecordLoadState } from '../components/RecordPanel';
import useRecordSearch from '../hooks/useRecordSearch';

export default function SearchIDPCategoryPg() {
  const navigate = useNavigate();
  const location = useLocation();
  const { keyword, rows, error, loading, search, retry } = useRecordSearch('/idp-categories');
  const open = (row, action = '') => navigate(`/manager/categories/${row.id}${action}${location.search}`);
  return <section className="grid min-w-0 gap-6" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-4xl text-ink">IDP Categories</h1>
      <Button type="button" onClick={() => navigate(`/manager/categories/create${location.search}`)}>Create category</Button>
    </div>
    <SearchBar key={keyword} initialKeyword={keyword} placeholder="Search IDP categories" onSearch={search} />
    <Message type="success" text={location.state?.message} />
    <RecordLoadState loading={loading} error={error} onRetry={retry} />
    {!loading && !error && <ResultsTable ariaLabel="IDP categories" rows={rows}
      columns={[{ key: 'name', label: 'Category name' }, { key: 'description', label: 'Description' }]}
      actions={[
        { label: 'View', onClick: (row) => open(row) },
        { label: 'Update', onClick: (row) => open(row, '/edit') },
        { label: 'Delete', onClick: (row) => open(row, '/delete') },
      ]} />}
  </section>;
}
