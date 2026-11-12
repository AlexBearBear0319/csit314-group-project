// BCE: Boundary (shared UI state and loading).
// Keeps search input and the URL keyword in sync and loads matching rows.

// =============================================================================
// HOOK: useRecordSearch
// Loads a list with a search keyword, for example GET /api/user-profiles?keyword=admin.
// The keyword stays in the web address, so Back and Refresh keep the same results.
// Used by the Search pages. Returns { keyword, rows, error, loading, search, retry }.
// =============================================================================

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function useRecordSearch(resourcePath) {
  // Read and update the URL query without leaving this page.
  const [params, setParams] = useSearchParams();
  const keyword = params.get('keyword') || '';
  // Keep this value in component state so changes trigger a render.
  const [attempt, setAttempt] = useState(0);
  const key = `${resourcePath}:${keyword}:${attempt}`;
  // Keep this value in component state so changes trigger a render.
  const [result, setResult] = useState({ key: null, rows: [], error: '' });
  // Start or refresh the request when the effect dependencies change.
  useEffect(() => {
    // Give this request a cancellation signal so an obsolete load can be stopped.
    const controller = new AbortController();
    api.get(`${resourcePath}?keyword=${encodeURIComponent(keyword)}`, { signal: controller.signal })
      .then((rows) => { if (!controller.signal.aborted) setResult({ key, rows, error: '' }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ key, rows: [], error: error.message }); });
    // Cancel the previous request when the dependencies change or the component unmounts.
    return () => controller.abort();
  }, [resourcePath, keyword, key]);
  function search(value) {
    // Remove surrounding whitespace before applying the search term.
    const term = value.trim();
    // Refresh the results when the user submits the current keyword again.
    if (term === keyword) setAttempt((current) => current + 1);
    else setParams((current) => {
      const next = new URLSearchParams(current);
      if (term) next.set('keyword', term);
      else next.delete('keyword');
      return next;
    });
  }
  return { keyword, rows: result.key === key ? result.rows : [],
    error: result.key === key ? result.error : '', loading: result.key !== key,
    search, retry: () => setAttempt((current) => current + 1) };
}
