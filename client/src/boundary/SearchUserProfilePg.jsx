// =============================================================================
// BOUNDARY: SearchUserProfilePg                     (BCE: Boundary layer)
// User story #5: As a User Admin, I want to search for user profiles so that
// I can quickly find a specific profile.
//
// This page is also the profile list: with no keyword it shows every profile,
// and it links to View (#2), Update (#3) and Suspend (#4). "Activate" is the
// alternative flow of #4.
//
// What this page does (the steps of our sequence diagram):
//   1. the admin types a keyword in the search bar (max 255 characters)
//   2. search(keyword)          sends it to SearchUserProfileC
//                               (GET /api/user-profiles?keyword=...)
//   3. shows the matching profiles in a table, or the load error
//   4. activateProfile(row)     POST /api/user-profiles/:id/activate, then reloads
// =============================================================================

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Button from '../components/Button';
import Message from '../components/Message';
import ResultsTable from '../components/ResultsTable';
import SearchBar from '../components/SearchBar';
import { RecordLoadState } from '../components/RecordPanel';
import useRecordSearch from '../hooks/useRecordSearch';

export default function SearchUserProfilePg() {
  const navigate = useNavigate();
  const location = useLocation();
  const { keyword, rows, loading, error, search, retry } = useRecordSearch('/user-profiles');
  const [message, setMessage] = useState({ type: '', text: '' });
  const open = (row, action = '') => navigate(`/admin/profiles/${row.id}${action}${location.search}`);
  // Alternative flow of #4: no confirm pop-up, activating is easy to undo.
  async function activateProfile(row) {
    setMessage({ type: '', text: '' });
    try {
      const updated = await api.post(`/user-profiles/${row.id}/activate`);
      setMessage({ type: 'success', text: `"${updated.name}" is active again. Its accounts can log in.` });
      retry();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'The profile could not be activated. Try again.' });
    }
  }
  return <section className="grid min-w-0 gap-6" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-4xl text-ink">User Profiles</h1>
      <Button type="button" onClick={() => navigate(`/admin/profiles/create${location.search}`)}>Create profile</Button>
    </div>
    <SearchBar key={keyword} initialKeyword={keyword} placeholder="Search user profiles" onSearch={search} onClear={() => search('')} />
    <Message type={message.type} text={message.text} />
    <RecordLoadState loading={loading} error={error} onRetry={retry} />
    {!loading && !error && <ResultsTable ariaLabel="User profiles" rows={rows}
      columns={[{ key: 'name', label: 'Profile name' }, { key: 'description', label: 'Description' }, { key: 'status', label: 'Status' }]}
      actions={[
        { label: 'View', onClick: (row) => open(row) },
        { label: 'Update', onClick: (row) => open(row, '/edit') },
        { label: 'Suspend', show: (row) => row.status !== 'suspended', onClick: (row) => open(row, '/suspend') },
        { label: 'Activate', show: (row) => row.status === 'suspended', onClick: activateProfile },
      ]} />}
  </section>;
}
