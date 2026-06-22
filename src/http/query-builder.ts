import type { ComparisonFilter, MovieFilters, QuoteFilters } from '../types/filters.js';
import type { ListOptions } from '../types/pagination.js';

type FilterRecord = MovieFilters | QuoteFilters;

export function buildQueryString(options?: ListOptions<FilterRecord>): string {
  if (!options) {
    return '';
  }

  const params: string[] = [];

  if (options.page != null) {
    params.push(`page=${options.page}`);
  }
  if (options.limit != null) {
    params.push(`limit=${options.limit}`);
  }
  if (options.offset != null) {
    params.push(`offset=${options.offset}`);
  }

  // Filters before sort — matches API doc examples and avoids server-side parser issues
  // when combining Mongo-style comparisons (runtimeInMinutes>=160) with sort=name:asc
  if (options.filter) {
    params.push(...buildFilterParams(options.filter));
  }

  if (options.sort) {
    for (const [field, direction] of Object.entries(options.sort)) {
      // API docs use sort=name:asc (colon not encoded)
      params.push(`sort=${field}:${direction}`);
    }
  }

  return params.length > 0 ? `?${params.join('&')}` : '';
}

function buildFilterParams(filter: FilterRecord): string[] {
  const params: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === 'raw') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        params.push(...buildRawFilterParams(value as Record<string, string | number | boolean>));
      }
      continue;
    }

    if (value == null) {
      continue;
    }

    if (key === 'name' || key === 'dialog') {
      params.push(`${key}=${formatStringOrRegex(value as string | RegExp)}`);
      continue;
    }

    if (key === 'movie' || key === 'character') {
      params.push(`${key}=${encodeURIComponent(String(value))}`);
      continue;
    }

    params.push(...buildComparison(key, value as ComparisonFilter));
  }

  return params;
}

function buildRawFilterParams(raw: Record<string, string | number | boolean>): string[] {
  return Object.entries(raw).map(([key, value]) => `${key}=${value}`);
}

function formatStringOrRegex(value: string | RegExp): string {
  if (value instanceof RegExp) {
    return value.toString();
  }
  return encodeURIComponent(value);
}

function buildComparison(field: string, value: ComparisonFilter): string[] {
  if (typeof value === 'number') {
    return [`${field}=${value}`];
  }

  const params: string[] = [];
  if (value.gt != null) params.push(`${field}>${value.gt}`);
  if (value.gte != null) params.push(`${field}>=${value.gte}`);
  if (value.lt != null) params.push(`${field}<${value.lt}`);
  if (value.lte != null) params.push(`${field}<=${value.lte}`);
  if (value.ne != null) params.push(`${field}!=${value.ne}`);
  return params;
}
