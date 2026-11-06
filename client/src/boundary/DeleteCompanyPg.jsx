import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ConfirmAction from '../components/ConfirmAction';
export default function DeleteCompanyPg({company}) {
  const navigate=useNavigate();
  function displaySuccess(){navigate('/designer/company',{replace:true,state:{message:'Company deleted.'}});}
  async function deleteCompany(){await api.del('/companies/mine');displaySuccess();}
  return <ConfirmAction title="Delete company" description={'Delete '+company.name+'?'} label="Delete company" onConfirm={deleteCompany}/>;
}
