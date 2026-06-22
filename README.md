# LOTR SDK

TypeScript client for [The One API](https://the-one-api.dev/documentation) — a developer-friendly wrapper over the Lord of the Rings REST API.

## Setup

1. Get an API key from [the-one-api.dev/sign-up](https://the-one-api.dev/sign-up)
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and set your key (for local demo only — never commit secrets)

## Quick start

```typescript
import { LotrClient } from './src/index.js';

const client = new LotrClient({
  apiKey: process.env.LOTR_API_KEY!,
});

const movies = await client.movies.list({
  filter: { runtimeInMinutes: { gte: 160 } },
  limit: 5,
  sort: { rottenTomatoesScore: 'desc' },
});

const movie = await client.movies.get('5cd95395de30eff6ebccde5b');
const quotes = await client.movies.quotes(movie._id, { limit: 5 });

// Random quote from one film, or from the whole API
const fromMovie = await client.movies.randomQuote(movie._id);
const anywhere = await client.quotes.random(); // GET /quotes/random/
```

After building, consumers import from the package entry: `import { LotrClient } from 'lotr-sdk'`.

## API reference

### Client

```typescript
new LotrClient({
  apiKey: string;           // required
  baseUrl?: string;         // default: https://the-one-api.dev/v2
  timeoutMs?: number;       // default: 10000
  fetch?: typeof fetch;     // injectable (e.g. for tests or logging)
})
```

### Movies

| Method | HTTP | Description |
|--------|------|-------------|
| `movies.list(options?)` | `GET /movie` | Paginated movie list |
| `movies.listAll(options?)` | `GET /movie` | All pages merged |
| `movies.get(id)` | `GET /movie/{id}` | Single movie (`id` = movie `_id`) |
| `movies.quotes(movieId, options?)` | `GET /movie/{id}/quote` | Quotes for a movie (`movieId` = movie `_id`) |
| `movies.quotesByName(name)` | multiple | Find movie by name, return first page of quotes |
| `movies.randomQuote(movieId)` | `GET /movie/{id}/quote` ×2 | Random quote from one film (random `offset`) |
| `movies.randomQuoteByName(name)` | multiple | Find movie by name, then `randomQuote` |

### Quotes

| Method | HTTP | Description |
|--------|------|-------------|
| `quotes.list(options?)` | `GET /quote` | Paginated quote list |
| `quotes.listAll(options?)` | `GET /quote` | All pages merged |
| `quotes.get(id)` | `GET /quote/{id}` | Single quote (`id` = quote `_id`) |
| `quotes.random()` | `GET /quotes/random/` | One random quote (falls back to `GET /quote` + offset) |

### Filtering

Filters are sent to the API as [Mongo-style query parameters](https://the-one-api.dev/documentation). Use typed `filter` objects:

```typescript
// Movies — comparisons, regex, exact match
await client.movies.list({
  page: 1,
  limit: 10,
  filter: {
    runtimeInMinutes: { gte: 160 },
    academyAwardWins: { gt: 0 },
    name: /Fellowship/i,
    raw: { 'budgetInMillions<': 100 }, // escape hatch for unmodeled params
  },
});

// Quotes — filter by movie id, character id, or dialog regex
await client.quotes.list({
  filter: {
    movie: '5cd95395de30eff6ebccde5b',
    character: '5cd99d09430f97647ee03669',
    dialog: /ring/i,
  },
});
```

### Sorting

Pass `sort` on `list`, `listAll`, `movies.quotes`, etc.:

```typescript
await client.movies.listAll({ sort: { academyAwardWins: 'desc' } });

await client.quotes.list({
  filter: { dialog: /ring/i },
  sort: { dialog: 'asc' },
});
```

**Note:** The live API returns HTTP 500 for server-side `sort` on `/movie` and `/quote`. The SDK strips `sort` from the request and **sorts results client-side** so callers can still use the option.

| Method | Sort scope |
|--------|------------|
| `list({ sort })` | Current page only |
| `listAll({ sort })` | Full dataset after all pages are fetched |

Useful movie sort fields: `name`, `runtimeInMinutes`, `rottenTomatoesScore`, `academyAwardWins`, `academyAwardNominations`.  
For quotes, `dialog` sorts alphabetically; `movie` / `character` sort by ObjectId string.

### Pagination and rate limits

The API allows **100 requests per 10 minutes**. `listAll()` issues one request per page (100 items per page) — use sparingly on large collections like quotes.

### Errors

```typescript
import { AuthenticationError, NotFoundError, RateLimitError, ApiError } from './src/index.js';

try {
  await client.movies.get('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) { /* empty docs on get */ }
  if (error instanceof AuthenticationError) { /* 401 */ }
  if (error instanceof RateLimitError) { /* 429 */ }
  if (error instanceof ApiError) { /* other HTTP failures, timeouts */ }
}
```

## Test the SDK

**Unit tests** (mocked HTTP — no API key, no network):

```bash
npm test
npm run typecheck
```

**Live smoke test** (requires `LOTR_API_KEY` in `.env`):

```bash
npm run diagnose   # step-by-step checks for all five endpoints
npm run demo       # feature walkthrough
```

Copy `.env.example` to `.env` before running live scripts:

```bash
cp .env.example .env
# edit .env — set LOTR_API_KEY=your_key
npm run diagnose
```

Or pass the key inline:

```bash
LOTR_API_KEY=your_key npm run demo
```

**Build** compiled output to `dist/`:

```bash
npm run build
```

## Architecture

See [design.md](./design.md) for architecture, API integration details, and design decisions.

## License

MIT
