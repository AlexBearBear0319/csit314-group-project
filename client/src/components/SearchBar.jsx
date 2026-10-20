// SearchBar — used by every SEARCH story.
// Usage: <SearchBar placeholder="Search accounts" onSearch={(keyword) => ...} />
import { useId, useState } from 'react';
import Button from './Button';

export default function SearchBar({ placeholder = 'Search...', onSearch }) {
  const inputId = useId();
  const [keyword, setKeyword] = useState('');
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
    </form>
  );
}
