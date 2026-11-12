// =============================================================================
// BOUNDARY: SearchCompanyPg                         (BCE: Boundary layer)
// User story #17: As an Interior Designer, I want to search my company
// information so that I can find it quickly.
//
// What this page does (the steps of our sequence diagram):
//   1. the designer types a keyword in the search bar (max 255 characters)
//   2. search(keyword)          sends it to SearchCompanyC
//                               (GET /api/companies?keyword=...)
//   3. displaySuccess()         shows the matching company in a table
//      displayError()           shows the message when the search fails
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Message from '../components/Message';
import SearchBar from '../components/SearchBar';
import ResultsTable from '../components/ResultsTable';
import { RecordLoadState } from '../components/RecordPanel';
import useRecordSearch from '../hooks/useRecordSearch';
export default function SearchCompanyPg() {
  const navigate=useNavigate(), location=useLocation();
  const {keyword,rows,error,loading,search,retry}=useRecordSearch('/companies');
  // displaySuccess: show the matching companies in the table.
  function displaySuccess(){
    return <ResultsTable ariaLabel="Company information" rows={rows}
      columns={[{key:'name',label:'Company name'},{key:'description',label:'Description'}]}
      actions={[{label:'View',onClick:()=>navigate('/designer/company/mine')},{label:'Update',onClick:()=>navigate('/designer/company/mine/edit')}]}/>;
  }
  // displayError: show the load error with a Try again button.
  function displayError(){return <RecordLoadState loading={false} error={error} onRetry={retry}/>;}
  return <section className="grid min-w-0 gap-6" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-4xl text-ink">Company Information</h1>
      <Button type="button" onClick={()=>navigate('/designer/company/create')}>Create company</Button>
    </div>
    <SearchBar key={keyword} initialKeyword={keyword} placeholder="Search company information" onSearch={search} onClear={()=>search('')}/>
    <Message type="success" text={location.state?.message}/>
    {loading && <RecordLoadState loading error="" />}
    {error && displayError()}
    {!loading && !error && displaySuccess()}
  </section>;
}
