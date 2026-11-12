// BCE: Boundary.
// Lets the user submit new details and show the result for the IDP category feature.

// =============================================================================
// BOUNDARY: CreateIDPCategoryPg           (BCE: Boundary layer)
// User story #39: As a Platform Manager, I want to create an IDP category so
// that IDPs can be organised on the platform.
//
// What this page does (the steps of our sequence diagram for #39):
//   1. shows the form (a category name and a description)
//   2. validateInput(values)     checks the boxes BEFORE anything is sent
//   3. createCategory(values)    sends { name, description } to CreateIDPCategoryC
//                                (POST /api/idp-categories)
//   4. displaySuccess(category)  saved: open the new category
//      displayError(failure)     something is wrong: show the message
// =============================================================================

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { CATEGORY_FIELDS, validateCategoryInput } from './idpCategoryData';
import { CategoryPanel } from './idpCategoryShared';

export default function CreateIDPCategoryPg() {
  // Get the router function used to open the next page after an action.
  const navigate = useNavigate();
  const { search } = useLocation();
  // Keep this value in component state so changes trigger a render.
  const [saving, setSaving] = useState(false);
  // Keep this value in component state so changes trigger a render.
  const [error, setError] = useState('');
  // Keep this value in component state so changes trigger a render.
  const [errors, setErrors] = useState({});

  // Update the page after the server confirms the operation.
  function displaySuccess(category) {
    navigate(`/manager/categories/${category.id}${search}`, { replace: true, state: { message: 'IDP category created.' } });
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

  async function createCategory(values) {
    // Ignore repeated submissions while the current request is pending.
    if (saving) return;
    setError('');
    setErrors({});
    if (!validateInput(values)) return;

    setSaving(true);
    try {
      displaySuccess(await api.post('/idp-categories', values));
    } catch (failure) {
      displayError(failure);
    } finally {
      setSaving(false);
    }
  }

  return (
    <CategoryPanel title="Create IDP Category">
      <Message type="error" text={error} />
      <FormFields fields={CATEGORY_FIELDS} initial={{ name: '', description: '' }}
        submitLabel="Create category" onSubmit={createCategory} errors={errors} isSubmitting={saving} />
    </CategoryPanel>
  );
}
