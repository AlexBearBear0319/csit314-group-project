import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ConfirmAction from '../components/ConfirmAction';
export default function DeleteCompanyPg({company}) {
  const navigate=useNavigate();
  function displaySuccess(){navigate('/designer/company',{replace:true,state:{message:'Company deleted.'}});}
  // displayError: pass the message to the confirmation dialog, which shows it.
  function displayError(failure){throw failure;}
  async function deleteCompany(){
    try{await api.del('/companies/mine');}
    catch(failure){displayError(failure);return;}
    displaySuccess();
  }
  return <ConfirmAction title="Delete company" description={'Delete '+company.name+'?'} label="Delete company" onConfirm={deleteCompany}/>;
}
