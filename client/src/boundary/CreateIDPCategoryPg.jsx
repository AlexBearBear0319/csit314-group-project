import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FormFields from '../components/FormFields';
import Message from '../components/Message';
import { CATEGORY_FIELDS } from './idpCategoryData';
import { CategoryPanel } from './idpCategoryShared';

export default function CreateIDPCategoryPg() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  function displaySuccess(category) {
    navigate(`/manager/categories/${category.id}${search}`, { replace: true, state: { message: 'IDP category created.' } });
  }
  function displayError(failure) { setError(failure.message); setErrors(failure.errors || {}); }
  async function createCategory(values) {
    if (saving) return;
    setSaving(true); setError(''); setErrors({});
    try { displaySuccess(await api.post('/idp-categories', values)); }
    catch (failure) { displayError(failure); }
    finally { setSaving(false); }
  }
  return <CategoryPanel title="Create IDP Category">
    <Message type="error" text={error} />
    <FormFields fields={CATEGORY_FIELDS} initial={{ name: '', description: '' }}
      submitLabel="Create category" onSubmit={createCategory} errors={errors} isSubmitting={saving} />
  </CategoryPanel>;
}
