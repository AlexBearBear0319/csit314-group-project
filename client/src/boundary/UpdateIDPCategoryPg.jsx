import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { RecordLoadState } from '../components/RecordPanel';
import { CATEGORY_FIELDS, useIDPCategory } from './idpCategoryData';
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
  function displayError(failure) { setError(failure.message); setErrors(failure.errors || {}); }
  async function updateCategory(values) {
    if (saving) return;
    setSaving(true); setError(''); setErrors({});
    try { await api.put(`/idp-categories/${id}`, values); displaySuccess(); }
    catch (failure) { displayError(failure); }
    finally { setSaving(false); }
  }
  return <CategoryPanel title="Update IDP Category">
    <RecordLoadState loading={loading} error={loadError} onRetry={retry} />
    <Message type="error" text={error} />
    {category && <FormFields key={id} fields={CATEGORY_FIELDS} initial={category}
      submitLabel="Save changes" onSubmit={updateCategory} errors={errors} isSubmitting={saving} />}
  </CategoryPanel>;
}
