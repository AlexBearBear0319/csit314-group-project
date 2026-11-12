// =============================================================================
// BOUNDARY: UpdateCompanyPg               (BCE: Boundary layer)
// User story #15: As an Interior Designer, I want to update my company
// information so that it stays accurate.
//
// What this page does (the steps of our sequence diagram for #15):
//   1. useCompany() loads the current company (GET /api/companies/mine) and the
//      form opens with those values
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. updateCompany(values)     sends { name, description } to UpdateCompanyC
//                                (PUT /api/companies/mine)
//   4. displaySuccess()          saved: go back to the company page
//      displayError(failure)     something is wrong: show the message
// =============================================================================

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import RecordPanel, { RecordLoadState } from '../components/RecordPanel';
import { COMPANY_FIELDS, useCompany, validateCompanyInput } from './companyData';

export default function UpdateCompanyPg() {
  const navigate = useNavigate();
  const pending = useRef(false); // stops a double click from sending twice
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const { company, error: loadError, loading, retry } = useCompany();

  function displaySuccess() {
    navigate('/designer/company/mine', { replace: true, state: { message: 'Company updated.' } });
  }

  function displayError(failure) {
    setError(failure.message);
    setErrors(failure.errors || {});
  }

  function validateInput(values) {
    const problems = validateCompanyInput(values);
    if (Object.keys(problems).length) {
      displayError({ message: 'Check the company details.', errors: problems });
      return false;
    }
    return true;
  }

  async function updateCompany(values) {
    if (pending.current) return;
    setError('');
    setErrors({});
    if (!validateInput(values)) return;

    pending.current = true;
    setSaving(true);
    try {
      await api.put('/companies/mine', values);
      displaySuccess();
    } catch (failure) {
      displayError(failure);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <RecordPanel title="Update Company" listPath="/designer/company" backLabel="Back to company information">
      <RecordLoadState loading={loading} error={loadError} onRetry={retry} />
      <Message type="error" text={error} />
      {company && <FormFields fields={COMPANY_FIELDS} initial={company}
        errors={errors} isSubmitting={saving} submitLabel="Save changes" onSubmit={updateCompany} />}
    </RecordPanel>
  );
}
