// SearchBar: the search box and Search button that every list page shares.
//
// Basic use:
//   <SearchBar placeholder="Search accounts" onSearch={(keyword) => ...} />
//
// To also offer a way back to the full list, pass onClear:
//   <SearchBar onSearch={search} onClear={() => search('')} />
// The Clear button then appears as soon as there is something to clear.
//
// A page with extra filters (dropdowns) knows things this box cannot see, so it
// can pass alwaysShowClear and its own clearLabel, such as "Clear filters".
import { useId, useState } from 'react';
import Button from './Button';

export default function SearchBar({
  placeholder = 'Search...',
  onSearch,
  initialValue = '',
  initialKeyword = initialValue,
  onClear,
  clearLabel = 'Clear search',
  alwaysShowClear = false,
}) {
  const inputId = useId();
  const [keyword, setKeyword] = useState(initialKeyword);
  // No onClear means this page did not ask for the button at all.
  const showClear = onClear && (alwaysShowClear || keyword);

  // Empty the box here, then let the page reload its full list.
  function clearSearch() {
    setKeyword('');
    onClear();
  }

  return (
    <form
      className="mb-6 flex flex-col gap-3 sm:flex-row"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch?.(keyword);
      }}
    >
      <label className="sr-only" htmlFor={inputId}>Search</label>
      <input
        id={inputId}
        className="min-h-[46px] min-w-0 flex-1 rounded-control border border-border bg-white px-3 py-2.5 text-base text-ink shadow-sm placeholder:text-muted focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/20"
        placeholder={placeholder}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      <Button type="submit" variant="primary" className="sm:min-w-28">Search</Button>
      {showClear && <Button type="button" variant="secondary" onClick={clearSearch}>{clearLabel}</Button>}
    </form>
  );
}
