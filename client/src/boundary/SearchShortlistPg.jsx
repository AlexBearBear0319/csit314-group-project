// =============================================================================
// BOUNDARY: SearchShortlistPg
// Story: "As a Customer, I want to search my shortlist so that I can quickly
// find a specific saved IDP."
// Methods from the design: searchSaved(), displaySuccess(), displayError()
//
// This is the search box on My Shortlist. It does the searching, and hands the
// answer to ViewShortlistPg, which draws the table.
//
// Flow: Search clicked -> GET /api/customer/shortlist?keyword=...
//   -> SearchShortlistC -> ShortlistItem entity -> matches go back to the table
//
// What the parent passes in:
//   onSearchStart = a search has begun, so show "Loading"
//   onResults     = here are the matching projects
//   onSearchFail  = the search failed, here is the message
// =============================================================================

import { useEffect, useRef } from 'react';
import { api } from '../api';
import SearchBar from '../components/SearchBar';

export default function SearchShortlistPg({ onSearchStart, onResults, onSearchFail }) {
  // The search in progress. A new search cancels the old one, so a slow reply
  // can never replace newer results.
  const latestSearch = useRef(null);

  // Leaving the page cancels whatever is still running.
  useEffect(() => () => latestSearch.current?.abort(), []);

  function displaySuccess(list) {
    onResults(list);
  }

  function displayError(message) {
    onSearchFail(message || 'Your shortlist could not be searched. Try again.');
  }

  // text = the words in the box. Empty text brings back the whole shortlist,
  // which is exactly what the Clear search button needs.
  function searchSaved(text) {
    latestSearch.current?.abort();
    const controller = new AbortController();
    latestSearch.current = controller;
    onSearchStart();
    api.get(`/customer/shortlist?keyword=${encodeURIComponent(text.trim())}`, { signal: controller.signal })
      .then((list) => { if (!controller.signal.aborted) displaySuccess(list); })
      .catch((failure) => { if (!controller.signal.aborted) displayError(failure.message); });
  }

  return (
    <SearchBar
      placeholder="Search by project name, property type or design style"
      onSearch={searchSaved}
      onClear={() => searchSaved('')}
    />
  );
}
