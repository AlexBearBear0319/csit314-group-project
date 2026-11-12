// =============================================================================
// BOUNDARY: DeleteIDPCategoryPg                     (BCE: Boundary layer)
// User story #42: As a Platform Manager, I want to delete an IDP category so
// that an unused or inappropriate category is removed.
//
// What this page does (the steps of our sequence diagram):
//   1. loads the category (GET /api/idp-categories/:id) and shows its details
//   2. the manager taps "Delete category" and a pop-up asks them to confirm
//   3. deleteCategory()         sends the request to DeleteIDPCategoryC
//                               (DELETE /api/idp-categories/:id)
//   4. displaySuccess()         deleted: go back to the category list
//      the pop-up shows the server message if it fails, for example when projects
//      still use the category
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ConfirmAction from '../components/ConfirmAction';
import DetailsView from '../components/DetailsView';
import { RecordLoadState } from '../components/RecordPanel';
import { useIDPCategory } from './idpCategoryData';
import { CategoryPanel } from './idpCategoryShared';

export default function DeleteIDPCategoryPg() {
  const { id, category, error, loading, retry } = useIDPCategory();
  const navigate = useNavigate();
  const { search } = useLocation();
  function displaySuccess() {
    navigate(`/manager/categories${search}`, { replace: true, state: { message: 'IDP category deleted.' } });
  }
  async function deleteCategory() {
    await api.del(`/idp-categories/${id}`);
    displaySuccess();
  }
  return <CategoryPanel title="Delete IDP Category">
    <RecordLoadState loading={loading} error={error} onRetry={retry} />
    {category && <>
      <DetailsView item={category} fields={[
        { key: 'name', label: 'Category name' }, { key: 'description', label: 'Description' },
      ]} />
      <ConfirmAction title="Delete IDP category?" label="Delete category"
        description={`Delete “${category.name}”? This cannot be undone.`} onConfirm={deleteCategory} />
    </>}
  </CategoryPanel>;
}
