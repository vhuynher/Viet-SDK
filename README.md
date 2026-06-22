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
});

const movie = await client.movies.get('5cd95395de30eff6ebccde5b');
const quotes = await client.movies.quotes(movie._id);
```

## API reference

### Client

```typescript
new LotrClient({
  apiKey: string;           // required
  baseUrl?: string;         // default: https://the-one-api.dev/v2
  timeoutMs?: number;       // default: 10000
})
```

### Movies

| Method | HTTP | Description |
|--------|------|-------------|
| `movies.list(options?)` | `GET /movie` | Paginated movie list |
| `movies.listAll(options?)` | `GET /movie` | All pages merged |
| `movies.get(id)` | `GET /movie/{id}` | Single movie |
| `movies.quotes(movieId, options?)` | `GET /movie/{id}/quote` | Quotes for a movie |
| `movies.quotesByName(name)` | multiple | Find movie by name, return quotes |

### Quotes

| Method | HTTP | Description |
|--------|------|-------------|
| `quotes.list(options?)` | `GET /quote` | Paginated quote list |
| `quotes.listAll(options?)` | `GET /quote` | All pages merged |
| `quotes.get(id)` | `GET /quote/{id}` | Single quote |

### Filtering

```typescript
await client.movies.list({
  page: 1,
  limit: 10,
  sort: { name: 'asc' },
  filter: {
    runtimeInMinutes: { gte: 160 },
    academyAwardWins: { gt: 0 },
    name: /Fellowship/i,
    raw: { 'budgetInMillions<': 100 }, // escape hatch
  },
});

await client.quotes.list({
  filter: {
    movie: '5cd95395de30eff6ebccde5b',
    dialog: /ring/i,
  },
});
```

### Errors

```typescript
import { AuthenticationError, NotFoundError, RateLimitError } from './src/index.js';

try {
  await client.movies.get('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) { /* ... */ }
}
```

## Scripts

```bash
npm test          # run unit tests
npm run typecheck # TypeScript check
npm run build     # compile to dist/
npm run demo      # live API demo (requires LOTR_API_KEY)
npm run diagnose  # step-by-step API smoke checks
```

Run the demo (reads `LOTR_API_KEY` from `.env` if present):

```bash
npm run demo
```

Or pass the key inline:

```bash
LOTR_API_KEY=your_key npm run demo
```

## Architecture

See [design.md](./design.md) for architecture, API integration details, and design decisions.

## License

MIT
