import { describe, expect, it } from 'vitest';
import { clientSortDocs, omitSort } from '../src/http/client-sort.js';

describe('clientSortDocs', () => {
  const movies = [
    { name: 'Zulu', runtimeInMinutes: 200 },
    { name: 'Alpha', runtimeInMinutes: 100 },
    { name: 'Mike', runtimeInMinutes: 150 },
  ];

  it('returns docs unchanged when no sort', () => {
    expect(clientSortDocs(movies)).toEqual(movies);
  });

  it('sorts by string field asc', () => {
    expect(clientSortDocs(movies, { name: 'asc' }).map((m) => m.name)).toEqual([
      'Alpha',
      'Mike',
      'Zulu',
    ]);
  });

  it('sorts by numeric field desc', () => {
    expect(clientSortDocs(movies, { runtimeInMinutes: 'desc' }).map((m) => m.runtimeInMinutes)).toEqual([
      200, 150, 100,
    ]);
  });
});

describe('omitSort', () => {
  it('removes sort from options passed to the API', () => {
    const { options, sort } = omitSort({
      limit: 5,
      sort: { name: 'asc' },
      filter: { runtimeInMinutes: { gte: 160 } },
    });

    expect(sort).toEqual({ name: 'asc' });
    expect(options).toEqual({
      limit: 5,
      filter: { runtimeInMinutes: { gte: 160 } },
    });
  });
});
