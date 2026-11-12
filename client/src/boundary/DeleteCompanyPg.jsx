// =============================================================================
// BOUNDARY: DeleteCompanyPg                         (BCE: Boundary layer)
// User story #16: As an Interior Designer, I want to delete my company
// information so that it is no longer shown.
//
// This is the "Delete company" button and its confirm pop-up. ViewCompanyPg shows it.
//
// What this page does (the steps of our sequence diagram):
//   1. the designer taps "Delete company" and a pop-up asks them to confirm
//   2. deleteCompany()          sends the request to DeleteCompanyC
//                               (DELETE /api/companies/mine)
//   3. displaySuccess()         deleted: go to the company list
//      displayError(failure)    something is wrong: the pop-up shows the message
// =============================================================================

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
