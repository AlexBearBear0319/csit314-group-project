import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import RecordPanel from '../components/RecordPanel';
import { COMPANY_FIELDS } from './companyData';
export default function CreateCompanyPg() {
  const navigate=useNavigate();
  const pending=useRef(false);
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[errors,setErrors]=useState({});

  function displaySuccess() { navigate('/designer/company/mine',{replace:true,state:{message:'Company created.'}}); }
  function displayError(failure) { setError(failure.message);setErrors(failure.errors || {}); }
  async function createCompany(values) {
    if(pending.current)return;
    pending.current=true;setSaving(true);setError('');setErrors({});
    try { await api.post('/companies',values);displaySuccess(); }
    catch(failure){displayError(failure);}
    finally{pending.current=false;setSaving(false);}
  }
  return <RecordPanel title="Create Company" listPath="/designer/company" backLabel="Back to company information">

    <Message type="error" text={error}/>
    <FormFields fields={COMPANY_FIELDS} initial={{name:'',description:''}}
      errors={errors} isSubmitting={saving} submitLabel="Create company" onSubmit={createCompany}/>
  </RecordPanel>;
}
