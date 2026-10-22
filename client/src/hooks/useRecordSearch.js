import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function useRecordSearch(resourcePath) {
  const [params, setParams] = useSearchParams();
  const keyword = params.get('keyword') || '';
  const [attempt, setAttempt] = useState(0);
  const key = `${resourcePath}:${keyword}:${attempt}`;
  const [result, setResult] = useState({ key: null, rows: [], error: '' });
  useEffect(() => {
    const controller = new AbortController();
    api.get(`${resourcePath}?keyword=${encodeURIComponent(keyword)}`, { signal: controller.signal })
      .then((rows) => { if (!controller.signal.aborted) setResult({ key, rows, error: '' }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ key, rows: [], error: error.message }); });
    return () => controller.abort();
  }, [resourcePath, keyword, key]);
  function search(value) {
    const term = value.trim();
    if (term === keyword) setAttempt((current) => current + 1);
    else setParams((current) => {
      const next = new URLSearchParams(current);
      if (term) next.set('keyword', term);
      else next.delete('keyword');
      return next;
    });
  }
  return { keyword, rows: result.key === key ? result.rows : [],
    error: result.key === key ? result.error : '', loading: result.key !== key,
    search, retry: () => setAttempt((current) => current + 1) };
}
