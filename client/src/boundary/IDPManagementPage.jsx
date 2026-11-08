import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import FormField from '../components/FormField';
import Message from '../components/Message';
import SearchBar from '../components/SearchBar';
import { RecordLoadState } from '../components/RecordPanel';
import OngoingIDPPage from './OngoingIDPPage';

// BCE boundary for the Customer's Search IDPs page (#32).
// The Customer types a keyword and picks filters here. The results themselves
// are drawn by OngoingIDPPage, which also holds the shortlist buttons.
export default function IDPManagementPage() {
  // The search lives in the web address, so Back and Refresh keep the same results.
  const [params, setParams] = useSearchParams();
  const searchKeyword = params.get('keyword') || '';
  const propertyType = params.get('propertyType') || '';
  const designStyle = params.get('designStyle') || '';
  const sort = params.get('sort') || 'date'; // 'date' means newest first
  const page = params.get('page') || '1';

  // A dropdown the Customer has changed but not searched with yet. Filter
  // choices only count once they press Search.
  const [draftFilters, setDraftFilters] = useState(null);
  const filterKey = `${propertyType}:${designStyle}`;
  const selectedPropertyType = draftFilters?.key === filterKey ? draftFilters.propertyType : propertyType;
  const selectedDesignStyle = draftFilters?.key === filterKey ? draftFilters.designStyle : designStyle;

  const [filters, setFilters] = useState({ propertyTypes: [], designStyles: [] });
  const [filterError, setFilterError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [attempt, setAttempt] = useState(0); // goes up by one to force a reload
  const [searchResults, setSearchResults] = useState({ key: null, data: null, error: '' });
  // IDs already in the shortlist. Kept here because the results below are redrawn
  // on every search, and the Saved buttons should not flicker back to Save.
  const [savedIds, setSavedIds] = useState(() => new Set());

  const query = new URLSearchParams({ page, sort });
  if (searchKeyword) query.set('keyword', searchKeyword);
  if (propertyType) query.set('propertyType', propertyType);
  if (designStyle) query.set('designStyle', designStyle);
  const queryString = query.toString();
  const requestKey = `${queryString}:${attempt}`;

  // Load the projects whenever the search changes. The abort stops a slow,
  // older reply from replacing a newer one.
  useEffect(() => {
    const controller = new AbortController();
    api.get(`/customer/idps?${queryString}`, { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) setSearchResults({ key: requestKey, data, error: '' });
      })
      .catch(failure => {
        if (!controller.signal.aborted) setSearchResults({ key: requestKey, data: null, error: failure.message });
      });
    return () => controller.abort();
  }, [queryString, requestKey]);

  // Fill the two filter dropdowns with the values that really exist.
  useEffect(() => {
    const controller = new AbortController();
    api.get('/customer/idps/filters', { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) {
          setFilters(data);
          setFilterError('');
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setFilterError(failure.message); });
    return () => controller.abort();
  }, [attempt]);

  // Find out what is already saved, so those cards open as "Saved". If this
  // fails the page still works: a repeat save is refused and then marked Saved.
  useEffect(() => {
    const controller = new AbortController();
    api.get('/customer/shortlist', { signal: controller.signal })
      .then(list => { if (!controller.signal.aborted) setSavedIds(new Set(list.map(project => project.id))); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const loading = searchResults.key !== requestKey;
  const data = loading ? null : searchResults.data;
  const error = loading ? '' : searchResults.error;

  // Runs when the Customer presses Search. A new search starts from page 1.
  function enterSearchKeyword(value) {
    const keyword = value.trim();
    if (!keyword && !selectedPropertyType && !selectedDesignStyle) {
      setValidationError('Enter a keyword or choose a filter.');
      return;
    }
    setValidationError('');
    const next = new URLSearchParams({ page: '1', sort });
    if (keyword) next.set('keyword', keyword);
    if (selectedPropertyType) next.set('propertyType', selectedPropertyType);
    if (selectedDesignStyle) next.set('designStyle', selectedDesignStyle);
    setParams(next);
    setAttempt(value => value + 1);
  }

  // Drops the keyword and both filters and goes back to showing every project.
  // The sort order is not a filter, so the Customer's choice stays.
  function clearFilters() {
    setValidationError('');
    setDraftFilters(null);
    setParams(new URLSearchParams({ page: '1', sort }));
    setAttempt(value => value + 1);
  }

  // One shared list, so saving in the pop-up also updates the card behind it.
  function markSaved(projectId) {
    setSavedIds(current => new Set(current).add(projectId));
  }

  // Changes the page or the sort order without touching the search.
  function changeResults(key, value) {
    setParams(current => {
      const next = new URLSearchParams(current);
      next.set(key, String(value));
      if (key === 'sort') next.set('page', '1');
      return next;
    });
  }

  function displaySearchBar() {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="customer-property-type" label="Property type" value={selectedPropertyType}
            onChange={event => setDraftFilters({ key: filterKey, propertyType: event.target.value, designStyle: selectedDesignStyle })}
            options={filters.propertyTypes.map(value => ({ value, label: value }))} />
          <FormField id="customer-design-style" label="Design style" value={selectedDesignStyle}
            onChange={event => setDraftFilters({ key: filterKey, propertyType: selectedPropertyType, designStyle: event.target.value })}
            options={filters.designStyles.map(value => ({ value, label: value }))} />
        </div>
        <SearchBar key={searchKeyword} initialKeyword={searchKeyword}
          placeholder="Search projects" onSearch={enterSearchKeyword}
          onClear={clearFilters} clearLabel="Clear filters" alwaysShowClear />
      </>
    );
  }

  function displayErrorMessage() {
    return <Message type="error" text={validationError || filterError} />;
  }

  function displaySearchResults() {
    if (!data) return null;
    return <OngoingIDPPage IDPList={data.projects} pagination={data} sort={sort}
      onPageChange={value => changeResults('page', value)}
      onSortChange={value => changeResults('sort', value)}
      savedIds={savedIds} onSaved={markSaved} />;
  }

  return (
    <section className="grid min-w-0 gap-6" aria-busy={loading}>
      <h1 className="font-display text-4xl text-ink">Search IDPs</h1>
      {displaySearchBar()}
      {displayErrorMessage()}
      <RecordLoadState loading={loading} error={error} onRetry={() => setAttempt(value => value + 1)} />
      {displaySearchResults()}
    </section>
  );
}
