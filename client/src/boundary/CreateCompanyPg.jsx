// BCE: Boundary.
// Lets the user submit new details and show the result for the company feature.

// =============================================================================
// BOUNDARY: CreateCompanyPg               (BCE: Boundary layer)
// User story #13: As an Interior Designer, I want to create my company
// information so that customers know who I work for.
//
// What this page does (the steps of our sequence diagram for #13):
//   1. shows the form (FormFields) with a name and a description
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. createCompany(values)     sends { name, description } to CreateCompanyC
//                                (POST /api/companies)
//   4. displaySuccess()          the company was saved: open the company page
//      displayError(failure)     something is wrong: show the message
//
// This page never touches the database. It only talks to the controller.
// =============================================================================

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import RecordPanel from '../components/RecordPanel';
import { COMPANY_FIELDS, validateCompanyInput } from './companyData';

export default function CreateCompanyPg() {
  const navigate = useNavigate();
  const pending = useRef(false); // stops a double click from sending twice
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); // red message at the top
  const [errors, setErrors] = useState({}); // messages under each box

  // Step 4: the company was saved.
  function displaySuccess() {
    navigate('/designer/company/mine', { replace: true, state: { message: 'Company created.' } });
  }

  // Step 4: show what went wrong. failure = { message, errors } from validateInput
  // or from the server.
  function displayError(failure) {
    setError(failure.message);
    setErrors(failure.errors || {});
  }

  // Step 2: check the boxes. Returns true if everything is fine.
  function validateInput(values) {
    const problems = validateCompanyInput(values);
    if (Object.keys(problems).length) {
      displayError({ message: 'Check the company details.', errors: problems });
      return false;
    }
    return true;
  }

  // Step 3: send the form to the controller.
  async function createCompany(values) {
    if (pending.current) return;
    setError('');
    setErrors({});
    if (!validateInput(values)) return;

    pending.current = true;
    setSaving(true);
    try {
      await api.post('/companies', values);
      displaySuccess();
    } catch (failure) {
      displayError(failure);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <RecordPanel title="Create Company" listPath="/designer/company" backLabel="Back to company information">
      <Message type="error" text={error} />
      <FormFields fields={COMPANY_FIELDS} initial={{ name: '', description: '' }}
        errors={errors} isSubmitting={saving} submitLabel="Create company" onSubmit={createCompany} />
    </RecordPanel>
  );
}
