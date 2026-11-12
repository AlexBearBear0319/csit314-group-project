// =============================================================================
// BOUNDARY HELPER: idpCategoryData
// Shared by the IDP category pages (stories #39-43).
//   CATEGORY_FIELDS         the boxes of the Create and Update forms
//   validateCategoryInput   the input check of the Create and Update forms
//   useIDPCategory          loads one category (by the :id in the address)
// =============================================================================

import useRecord from '../hooks/useRecord';
import { checkOptionalText, checkRequiredText, onlyProblems } from './inputRules';

export const CATEGORY_FIELDS = [
  { name: 'name', label: 'Category name', required: true, maxLength: 255 },
  { name: 'description', label: 'Description', type: 'textarea', maxLength: 255 },
];

// Returns { name: 'message', ... } with only the wrong boxes.
export function validateCategoryInput(values) {
  return onlyProblems({
    name: checkRequiredText(values.name, { label: 'category name', max: 255 }),
    description: checkOptionalText(values.description, { max: 255 }),
  });
}

// Loads the category with GET /api/idp-categories/:id.
export function useIDPCategory() {
  const { record, ...state } = useRecord('/idp-categories');
  return { ...state, category: record };
}
