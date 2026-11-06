import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import RecordPanel, { RecordLoadState } from '../components/RecordPanel';
import { COMPANY_FIELDS, useCompany } from './companyData';
export default function UpdateCompanyPg() {
  const navigate=useNavigate();
  const pending=useRef(false);
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[errors,setErrors]=useState({});
  const {company,error:loadError,loading,retry}=useCompany();
  function displaySuccess() { navigate('/designer/company/mine',{replace:true,state:{message:'Company updated.'}}); }
  function displayError(failure) { setError(failure.message);setErrors(failure.errors || {}); }
  async function updateCompany(values) {
    if(pending.current)return;
    pending.current=true;setSaving(true);setError('');setErrors({});
    try { await api.put('/companies/mine',values);displaySuccess(); }
    catch(failure){displayError(failure);}
    finally{pending.current=false;setSaving(false);}
  }
  return <RecordPanel title="Update Company" listPath="/designer/company" backLabel="Back to company information">
    <RecordLoadState loading={loading} error={loadError} onRetry={retry}/>
    <Message type="error" text={error}/>
    {company && <FormFields fields={COMPANY_FIELDS} initial={company}
      errors={errors} isSubmitting={saving} submitLabel="Save changes" onSubmit={updateCompany}/>}
  </RecordPanel>;
}
