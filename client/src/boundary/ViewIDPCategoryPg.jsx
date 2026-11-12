// BCE: Boundary.
// Lets the user load and display the selected record for the IDP category feature.

// =============================================================================
// BOUNDARY: ViewIDPCategoryPg                       (BCE: Boundary layer)
// User story #40: As a Platform Manager, I want to view an IDP category so that
// I can check its details.
//
// What this page does (the steps of our sequence diagram):
//   1. useIDPCategory() loads the category (GET /api/idp-categories/:id) from
//      ViewIDPCategoryC
//   2. shows the details and the buttons for Update (#41) and Delete (#42)
//      or the load error with a "Try again" button
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import DetailsView from '../components/DetailsView';
import Message from '../components/Message';
import { RecordLoadState } from '../components/RecordPanel';
import { useIDPCategory } from './idpCategoryData';
import { CategoryPanel } from './idpCategoryShared';

export default function ViewIDPCategoryPg() {
  const { id, category, error, loading, retry } = useIDPCategory();
  // Get the router function used to open the next page after an action.
  const navigate = useNavigate();
  const location = useLocation();
  return <CategoryPanel title="IDP Category">
    {!loading && !error && <Message type="success" text={location.state?.message} />}
    <RecordLoadState loading={loading} error={error} onRetry={retry} />
    {category && <>
      <DetailsView item={category} fields={[
        { key: 'name', label: 'Category name' }, { key: 'description', label: 'Description' },
      ]} />
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => navigate(`/manager/categories/${id}/edit${location.search}`)}>Update category</Button>
        <Button type="button" variant="secondary"
          onClick={() => navigate(`/manager/categories/${id}/delete${location.search}`)}>Delete category</Button>
      </div>
    </>}
  </CategoryPanel>;
}
