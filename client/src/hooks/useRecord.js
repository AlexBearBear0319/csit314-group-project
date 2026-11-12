// =============================================================================
// HOOK: useRecord
// Loads one record by the :id in the address, for example GET /api/idp-categories/5.
// Used by the View, Update and Delete / Suspend pages. Returns { id, record, error,
// loading, retry }.
// =============================================================================

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function useRecord(resourcePath) {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(0);
  const key = `${resourcePath}/${encodeURIComponent(id)}:${attempt}`;
  const [result, setResult] = useState({ key: null, record: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    api.get(`${resourcePath}/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((record) => { if (!controller.signal.aborted) setResult({ key, record, error: '' }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ key, record: null, error: error.message }); });
    return () => controller.abort();
  }, [resourcePath, id, key]);
  return { id, record: result.key === key ? result.record : null,
    error: result.key === key ? result.error : '', loading: result.key !== key,
    retry: () => setAttempt((value) => value + 1) };
}
