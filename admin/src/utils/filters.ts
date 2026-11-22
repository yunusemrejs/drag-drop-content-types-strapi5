export interface ExtractedFilters {
  filterRecord: Record<string, string>;
  filterQueryString: string;
  hasActiveFilters: boolean;
}

export function extractFilterParams(search: string): ExtractedFilters {
  const searchParams = new URLSearchParams(search);
  const filterRecord: Record<string, string> = {};
  const forwardedParams = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('filters[') || key.startsWith('filters.')) {
      filterRecord[key] = value;
      forwardedParams.append(key, value);
    }
  }

  const filterQueryString = forwardedParams.toString();
  return {
    filterRecord,
    filterQueryString,
    hasActiveFilters: Object.keys(filterRecord).length > 0,
  };
}
