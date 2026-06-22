import type { SortOptions } from '../types/pagination.js';

/**
 * The One API returns HTTP 500 for `sort` on /movie and /quote (verified 2026-06).
 * Sort works on /book and /character. We apply sort client-side for affected resources.
 */
export function clientSortDocs<T extends object>(docs: T[], sort?: SortOptions): T[] {
  if (!sort) {
    return docs;
  }

  const entries = Object.entries(sort);
  if (entries.length === 0) {
    return docs;
  }

  const [field, direction] = entries[0]!;
  const mult = direction === 'asc' ? 1 : -1;

  return [...docs].sort((a, b) => {
    const av = (a as Record<string, unknown>)[field];
    const bv = (b as Record<string, unknown>)[field];

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (typeof av === 'string' && typeof bv === 'string') {
      return mult * av.localeCompare(bv);
    }

    return mult * (Number(av) - Number(bv));
  });
}

export function omitSort<T extends { sort?: SortOptions }>(
  options?: T,
): { options: Omit<T, 'sort'> | undefined; sort: SortOptions | undefined } {
  if (!options?.sort) {
    return { options, sort: undefined };
  }

  const { sort, ...rest } = options;
  return { options: rest as Omit<T, 'sort'>, sort };
}
