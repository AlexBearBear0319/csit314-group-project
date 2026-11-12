// =============================================================================
// BOUNDARY: UpdateIDPCategoryPg           (BCE: Boundary layer)
// User story #41: As a Platform Manager, I want to update an IDP category so
// that its details stay accurate.
//
// What this page does (the steps of our sequence diagram for #41):
//   1. useIDPCategory() loads the category (GET /api/idp-categories/:id) and the
//      form opens with its values
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. updateCategory(values)    sends the new values to UpdateIDPCategoryC
//                                (PUT /api/idp-categories/:id)
//   4. displaySuccess()          saved: go back to the category
//      displayError(failure)     something is wrong: show the message
// =============================================================================

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { RecordLoadState } from '../components/RecordPanel';
import { CATEGORY_FIELDS, useIDPCategory, validateCategoryInput } from './idpCategoryData';
import { CategoryPanel } from './idpCategoryShared';

export default function UpdateIDPCategoryPg() {
  const { id, category, error: loadError, loading, retry } = useIDPCategory();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  function displaySuccess() {
    navigate(`/manager/categories/${id}${search}`, { replace: true, state: { message: 'IDP category updated.' } });
  }

  function displayError(failure) {
    setError(failure.message);
    setErrors(failure.errors || {});
  }

  function validateInput(values) {
    const problems = validateCategoryInput(values);
    if (Object.keys(problems).length) {
      displayError({ message: 'Check the category details.', errors: problems });
      return false;
    }
    return true;
  }

  async function updateCategory(values) {
    if (saving) return;
    setError('');
    setErrors({});
    if (!validateInput(values)) return;

    setSaving(true);
    try {
      await api.put(`/idp-categories/${id}`, values);
      displaySuccess();
    } catch (failure) {
      displayError(failure);
    } finally {
      setSaving(false);
    }
  }

  return (
    <CategoryPanel title="Update IDP Category">
      <RecordLoadState loading={loading} error={loadError} onRetry={retry} />
      <Message type="error" text={error} />
      {category && <FormFields key={id} fields={CATEGORY_FIELDS} initial={category}
        submitLabel="Save changes" onSubmit={updateCategory} errors={errors} isSubmitting={saving} />}
    </CategoryPanel>
  );
}
