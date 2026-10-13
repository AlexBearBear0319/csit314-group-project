// SearchBar — used by every SEARCH story.
// Usage: <SearchBar placeholder="Search accounts" onSearch={(keyword) => ...} />
import { useState } from 'react';

export default function SearchBar({ placeholder = 'Search...', onSearch }) {
  const [keyword, setKeyword] = useState('');
  return (
    <form
      className="d-flex gap-2 mb-3"
      onSubmit={(e) => { e.preventDefault(); onSearch(keyword); }}
    >
      <input
        className="form-control"
        placeholder={placeholder}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <button className="btn btn-primary" type="submit">Search</button>
    </form>
  );
}
