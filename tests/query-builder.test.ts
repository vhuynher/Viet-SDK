import { describe, expect, it } from 'vitest';
import { buildQueryString } from '../src/http/query-builder.js';

describe('buildQueryString', () => {
  it('returns empty string when no options', () => {
    expect(buildQueryString()).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  it('builds pagination params', () => {
    expect(buildQueryString({ page: 2, limit: 10, offset: 5 })).toBe(
      '?page=2&limit=10&offset=5',
    );
  });

  it('builds sort params', () => {
    expect(buildQueryString({ sort: { name: 'asc', runtimeInMinutes: 'desc' } })).toBe(
      '?sort=name:asc&sort=runtimeInMinutes:desc',
    );
  });

  it('builds exact string filters', () => {
    expect(buildQueryString({ filter: { name: 'Frodo' } })).toBe('?name=Frodo');
  });

  it('builds regex filters', () => {
    expect(buildQueryString({ filter: { name: /Fellowship/i } })).toBe('?name=/Fellowship/i');
  });

  it('builds comparison filters', () => {
    const qs = buildQueryString({
      filter: {
        runtimeInMinutes: { gte: 160, lt: 200 },
        academyAwardWins: { gt: 0 },
      },
    });
    expect(qs).toBe('?runtimeInMinutes>=160&runtimeInMinutes<200&academyAwardWins>0');
  });

  it('builds numeric equality filters', () => {
    expect(buildQueryString({ filter: { runtimeInMinutes: 178 } })).toBe(
      '?runtimeInMinutes=178',
    );
  });

  it('builds quote filters', () => {
    const qs = buildQueryString({
      filter: {
        movie: '5cd95395de30eff6ebccde5b',
        character: '5cd99d09430f97647ee03669',
        dialog: /ring/i,
      },
    });
    expect(qs).toBe(
      '?movie=5cd95395de30eff6ebccde5b&character=5cd99d09430f97647ee03669&dialog=/ring/i',
    );
  });

  it('merges raw filter escape hatch', () => {
    expect(
      buildQueryString({
        filter: {
          name: 'Frodo',
          raw: { race: 'Hobbit,Human' },
        },
      }),
    ).toBe('?name=Frodo&race=Hobbit,Human');
  });

  it('combines pagination, sort, and filter', () => {
    const qs = buildQueryString({
      page: 1,
      limit: 5,
      sort: { name: 'asc' },
      filter: { runtimeInMinutes: { gte: 160 } },
    });
    expect(qs).toBe('?page=1&limit=5&runtimeInMinutes>=160&sort=name:asc');
  });
});
