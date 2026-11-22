import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Returns the current URL search params reactively as a key-value map.
 * Uses react-router-dom's `useLocation` so SPA navigation updates query params.
 */
export function useQueryParams() {
  const { search } = useLocation();

  const queryParams = useMemo(() => {
    const searchParams = new URLSearchParams(search);
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [search]);

  return { queryParams };
}
