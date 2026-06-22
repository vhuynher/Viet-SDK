import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { LotrClient } from '../src/client.js';
import { NotFoundError } from '../src/errors/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8'));
}

function createMockFetch(routes: Record<string, unknown>) {
  const sortedRoutes = Object.entries(routes).sort((a, b) => b[0].length - a[0].length);

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const path = url.replace('https://the-one-api.dev/v2', '');

    for (const [route, body] of sortedRoutes) {
      if (path === route || path.startsWith(`${route}?`)) {
        return new Response(JSON.stringify(body), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ success: false, message: 'Not found' }), {
      status: 404,
    });
  });
}

describe('MoviesResource', () => {
  it('lists movies', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({
        '/movie?limit=10': loadFixture('movies-list.json'),
      }),
    });

    const result = await client.movies.list({ limit: 10 });
    expect(result.docs).toHaveLength(2);
    expect(result.docs[0]?.name).toBe('The Fellowship of the Ring');
  });

  it('gets a movie by id and unwraps docs[0]', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({
        '/movie/5cd95395de30eff6ebccde5b': loadFixture('movie-single.json'),
      }),
    });

    const movie = await client.movies.get('5cd95395de30eff6ebccde5b');
    expect(movie.name).toBe('The Fellowship of the Ring');
    expect(movie.runtimeInMinutes).toBe(178);
  });

  it('throws NotFoundError when get returns empty docs', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({
        '/movie/missing': { docs: [], total: 0, limit: 1000, offset: 0, page: 1, pages: 0 },
      }),
    });

    await expect(client.movies.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('fetches quotes for a movie', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({
        '/movie/5cd95395de30eff6ebccde5b/quote': loadFixture('movie-quotes.json'),
      }),
    });

    const quotes = await client.movies.quotes('5cd95395de30eff6ebccde5b');
    expect(quotes.docs).toHaveLength(2);
  });

  it('applies sort client-side without sending sort to the API', async () => {
    const fetchMock = createMockFetch({
      '/movie?limit=10&runtimeInMinutes%3E=160': loadFixture('movies-list.json'),
    });

    const client = new LotrClient({ apiKey: 'test-key', fetch: fetchMock });

    const result = await client.movies.list({
      limit: 10,
      filter: { runtimeInMinutes: { gte: 160 } },
      sort: { name: 'desc' },
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('sort=');
    expect(result.docs[0]?.name).toBe('The Two Towers');
  });

  it('quotesByName finds movie then fetches quotes', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({
        '/movie?limit=1&name=The%20Two%20Towers': {
          docs: [
            {
              _id: '5cd95395de30eff6ebccde5d',
              name: 'The Two Towers',
              runtimeInMinutes: 179,
              budgetInMillions: 94,
              boxOfficeRevenueInMillions: 926,
              academyAwardNominations: 6,
              academyAwardWins: 2,
              rottenTomatoesScore: 95,
            },
          ],
          total: 1,
          limit: 1,
          offset: 0,
          page: 1,
          pages: 1,
        },
        '/movie/5cd95395de30eff6ebccde5d/quote': loadFixture('movie-quotes.json'),
      }),
    });

    const quotes = await client.movies.quotesByName('The Two Towers');
    expect(quotes).toHaveLength(2);
  });

  it('randomQuote picks a quote by random offset', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const fetchMock = createMockFetch({
      '/movie/5cd95395de30eff6ebccde5b/quote?limit=1': {
        docs: [{ _id: 'a', id: 'a', dialog: 'First', movie: '5cd95395de30eff6ebccde5b', character: 'c1' }],
        total: 2,
        limit: 1,
        offset: 0,
        page: 1,
        pages: 2,
      },
      '/movie/5cd95395de30eff6ebccde5b/quote?limit=1&offset=1': {
        docs: [{ _id: 'b', id: 'b', dialog: 'Second', movie: '5cd95395de30eff6ebccde5b', character: 'c2' }],
        total: 2,
        limit: 1,
        offset: 1,
        page: 1,
        pages: 2,
      },
    });

    const client = new LotrClient({ apiKey: 'test-key', fetch: fetchMock });
    const quote = await client.movies.randomQuote('5cd95395de30eff6ebccde5b');

    expect(quote.dialog).toBe('Second');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
