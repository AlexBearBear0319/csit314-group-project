import useRecord from '../hooks/useRecord';

export const CATEGORY_FIELDS = [
  { name: 'name', label: 'Category name', required: true, maxLength: 255 },
  { name: 'description', label: 'Description', type: 'textarea', maxLength: 255 },
];

export function useIDPCategory() {
  const { record, ...state } = useRecord('/idp-categories');
  return { ...state, category: record };
}
