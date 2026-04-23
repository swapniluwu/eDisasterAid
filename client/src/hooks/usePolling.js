import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Like useApi but polls every ⁠ interval ⁠ ms automatically.
 * Stops polling when the tab is hidden (saves requests).
 */
export const usePolling = (apiFn, params = null, deps = [], interval = 15000) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const timerRef = useRef(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = params !== null ? await apiFn(params) : await apiFn();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      if (!silent) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetch(false); // Initial load

    // Poll silently
    timerRef.current = setInterval(() => {
      if (!document.hidden) fetch(true);
    }, interval);

    // Refetch when tab becomes visible again
    const onVisible = () => { if (!document.hidden) fetch(true); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetch, interval]);

  return { data, loading, error, refetch: () => fetch(false) };
};