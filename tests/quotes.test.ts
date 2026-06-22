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

describe('QuotesResource', () => {
  it('lists quotes', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({ '/quote?limit=10': loadFixture('quotes-list.json') }),
    });

    const result = await client.quotes.list({ limit: 10 });
    expect(result.docs).toHaveLength(2);
  });

  it('gets a quote by id and unwraps docs[0]', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({
        '/quote/5cd96e05de30eff6ebcce7e9': loadFixture('quote-single.json'),
      }),
    });

    const quote = await client.quotes.get('5cd96e05de30eff6ebcce7e9');
    expect(quote.dialog).toBe('One ring to rule them all.');
    expect(quote._id).toBe(quote.id);
  });

  it('throws NotFoundError when get returns empty docs', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({
        '/quote/missing': { docs: [], total: 0, limit: 1000, offset: 0, page: 1, pages: 0 },
      }),
    });

    await expect(client.quotes.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sends filter params to the API without sort', async () => {
    const fetchMock = createMockFetch({
      '/quote?limit=10&movie=5cd95395de30eff6ebccde5b&dialog=/ring/i': loadFixture('quotes-list.json'),
    });

    const client = new LotrClient({ apiKey: 'test-key', fetch: fetchMock });

    const result = await client.quotes.list({
      limit: 10,
      filter: {
        movie: '5cd95395de30eff6ebccde5b',
        dialog: /ring/i,
      },
      sort: { dialog: 'asc' },
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('sort=');
    expect(result.docs).toHaveLength(2);
  });

  it('applies sort client-side without sending sort to the API', async () => {
    const fetchMock = createMockFetch({
      '/quote?limit=10': loadFixture('quotes-list.json'),
    });

    const client = new LotrClient({ apiKey: 'test-key', fetch: fetchMock });

    const result = await client.quotes.list({
      limit: 10,
      sort: { dialog: 'desc' },
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('sort=');
    expect(result.docs[0]?.dialog).toBe('You shall not pass!');
    expect(result.docs[1]?.dialog).toBe('One ring to rule them all.');
  });

  it('fetches a random quote from GET /quotes/random/', async () => {
    const client = new LotrClient({
      apiKey: 'test-key',
      fetch: createMockFetch({ '/quotes/random/': loadFixture('quote-single.json') }),
    });

    const quote = await client.quotes.random();
    expect(quote.dialog).toBe('One ring to rule them all.');
  });

  it('falls back to offset on GET /quote when random endpoint has no docs', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fetchMock = createMockFetch({
      '/quotes/random/': {},
      '/quote?limit=1': loadFixture('quotes-list.json'),
      '/quote?limit=1&offset=0': loadFixture('quotes-list.json'),
    });

    const client = new LotrClient({ apiKey: 'test-key', fetch: fetchMock });
    const quote = await client.quotes.random();

    expect(quote.dialog).toBe('One ring to rule them all.');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/quote?');
  });
});
