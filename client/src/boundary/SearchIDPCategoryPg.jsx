// BCE: Boundary.
// Lets the user apply a keyword and display matching records for the IDP category feature.

// =============================================================================
// BOUNDARY: SearchIDPCategoryPg                     (BCE: Boundary layer)
// User story #43: As a Platform Manager, I want to search for IDP categories
// so that I can quickly find a specific category.
//
// This page is also the category list: with no keyword it shows every category,
// and it links to View (#40), Update (#41) and Delete (#42).
//
// What this page does (the steps of our sequence diagram):
//   1. the manager types a keyword in the search bar (max 255 characters)
//   2. search(keyword)          sends it to SearchIDPCategoryC
//                               (GET /api/idp-categories?keyword=...)
//   3. shows the matching categories in a table, or the load error
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Message from '../components/Message';
import ResultsTable from '../components/ResultsTable';
import SearchBar from '../components/SearchBar';
import { RecordLoadState } from '../components/RecordPanel';
import useRecordSearch from '../hooks/useRecordSearch';

export default function SearchIDPCategoryPg() {
  // Get the router function used to open the next page after an action.
  const navigate = useNavigate();
  const location = useLocation();
  const { keyword, rows, error, loading, search, retry } = useRecordSearch('/idp-categories');
  const open = (row, action = '') => navigate(`/manager/categories/${row.id}${action}${location.search}`);
  return <section className="grid min-w-0 gap-6" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-4xl text-ink">IDP Categories</h1>
      <Button type="button" onClick={() => navigate(`/manager/categories/create${location.search}`)}>Create category</Button>
    </div>
    <SearchBar key={keyword} initialKeyword={keyword} placeholder="Search IDP categories" onSearch={search} onClear={() => search('')} />
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
