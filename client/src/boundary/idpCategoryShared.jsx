// =============================================================================
// BOUNDARY HELPER: idpCategoryShared
// The shared page frame (title + back link) of the IDP category pages (#39-43).
// =============================================================================

import RecordPanel from '../components/RecordPanel';

export function CategoryPanel({ title, children }) {
  return <RecordPanel title={title} listPath="/manager/categories" backLabel="Back to IDP categories">
    {children}
  </RecordPanel>;
}
