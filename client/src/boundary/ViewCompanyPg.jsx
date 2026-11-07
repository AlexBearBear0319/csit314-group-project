import { useLocation,useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import DetailsView from '../components/DetailsView';
import Message from '../components/Message';
import RecordPanel,{RecordLoadState} from '../components/RecordPanel';
import {useCompany} from './companyData';
import DeleteCompanyPg from './DeleteCompanyPg';
export default function ViewCompanyPg(){
  const {company,error,loading,retry}=useCompany();
  const location=useLocation(),navigate=useNavigate();
  // displaySuccess: show the company details and its action buttons.
  function displaySuccess(){
    return <><DetailsView item={company} fields={[{key:'name',label:'Company name'},{key:'description',label:'Description'}]}/>
    <div className="flex flex-wrap gap-3"><Button type="button" onClick={()=>navigate('/designer/company/mine/edit')}>Update company</Button><DeleteCompanyPg company={company}/></div></>;
  }
  // displayError: show the load error with a Try again button.
  function displayError(){return <RecordLoadState loading={false} error={error} onRetry={retry}/>;}
  return <RecordPanel title="Company Information" listPath="/designer/company" backLabel="Back to company information">
    {!loading && !error && <Message type="success" text={location.state?.message}/>}
    {loading && <RecordLoadState loading error="" />}
    {error && displayError()}
    {company && displaySuccess()}
  </RecordPanel>;
}
