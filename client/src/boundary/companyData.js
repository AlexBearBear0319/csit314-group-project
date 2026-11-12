// BCE: Boundary.
// Defines the record endpoint and exposes shared loading behavior for this feature.

// =============================================================================
// BOUNDARY HELPER: companyData
// Shared by the company pages (stories #13-17).
//   COMPANY_FIELDS         the boxes of the Create and Update forms
//   validateCompanyInput   the input check of the Create and Update forms
//   useCompany             loads the designer's own company from the server
// =============================================================================

import { useEffect, useState } from 'react';
import { api } from '../api';
import { checkOptionalText, checkRequiredText, onlyProblems } from './inputRules';

// The boxes of the form. FormFields draws one box for each entry.
export const COMPANY_FIELDS = [
  { name: 'name', label: 'Company name', required: true, maxLength: 255 },
  { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000 },
];

// The input check. Returns { name: 'message', ... } with only the wrong boxes.
// The server uses the same limits (255 for the name, 5,000 for the description).
export function validateCompanyInput(values) {
  return onlyProblems({
    name: checkRequiredText(values.name, { label: 'company name', max: 255 }),
    description: checkOptionalText(values.description, { max: 5000 }),
  });
}

// Loads the logged-in designer's company: GET /api/companies/mine.
// Returns { company, error, loading, retry }.
export function useCompany() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, company: null, error: '' });

  useEffect(() => {
    // Give this request a cancellation signal so an obsolete load can be stopped.
    const controller = new AbortController();
    api.get('/companies/mine', { signal: controller.signal })
      .then((company) => { if (!controller.signal.aborted) setResult({ key: attempt, company, error: '' }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ key: attempt, company: null, error: error.message }); });
    return () => controller.abort();
  }, [attempt]);

  // The result only counts if it answers the latest attempt.
  const current = result.key === attempt;
  return {
    company: current ? result.company : null,
    error: current ? result.error : '',
    loading: !current,
    retry: () => setAttempt((value) => value + 1),
  };
}
