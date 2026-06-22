# LOTR SDK — Design Document

This document describes the architecture and design of **LotrClient**, a TypeScript SDK for [The One API](https://the-one-api.dev/documentation). It is written for reviewers, maintainers, and engineers who need to understand how the client interfaces with the API and how the codebase is structured for long-term extension.

---

## 1. Overview

### Purpose

LotrClient wraps The One API's REST endpoints behind a typed, resource-oriented interface. The SDK covers the required movie and quote endpoints while being structured so that additional resources (books, characters, chapters) can be added without architectural changes.

### Design principles

| Principle | Application |
|-----------|-------------|
| **Developer experience** | Method names read like domain operations, not URL paths |
| **Type safety** | Exported interfaces for resources, filters, pagination, and errors |
| **Single responsibility** | HTTP transport, query building, and resource logic are separate modules |
| **Stateless** | No caching; The One API remains the source of truth |
| **Testability** | Injectable `fetch`; unit tests use mocks and fixtures |
| **Extensibility** | New resources plug into existing patterns |

### Scope (v1)

| In scope | Out of scope |
|----------|--------------|
| Five movie/quote endpoints | Books, characters, chapters (designed for, not implemented) |
| Filtering, pagination, sorting | Response caching |
| Unit tests + demo script | OpenAPI code generation |
| Production-oriented errors and config | Publishing to a package registry |

---

## 2. Relationship to The One API

### What LotrClient is

LotrClient is a **client library** — not an API server, not a data cache. Each public method ultimately issues an HTTP request to `https://the-one-api.dev/v2`.

```
Application code
      │
      ▼
  LotrClient          ← typed methods, filters, errors
      │
      ▼
  HTTP (REST)         ← GET /movie, /quote, etc.
      │
      ▼
  the-one-api.dev
```

### Authentication

All movie and quote endpoints require a Bearer token:

```http
Authorization: Bearer <API_KEY>
```

The SDK accepts the key at construction time and attaches it to every request via `HttpClient`. Keys are never read implicitly from the environment inside the library; callers pass them explicitly (demo and README show `process.env.LOTR_API_KEY` as a convention).

### Response envelope

List and single-resource endpoints share a paginated envelope:

```json
{
  "docs": [ /* resources */ ],
  "total": 8,
  "limit": 10,
  "offset": 0,
  "page": 1,
  "pages": 2
}
```

**SDK behavior:**

| API response | SDK return type |
|--------------|-----------------|
| `GET /movie` (list) | `PaginatedResponse<Movie>` — envelope preserved |
| `GET /movie/{id}` (single) | `Movie` — `docs[0]` unwrapped; empty `docs` throws `NotFoundError` |
| `GET /quote` (list) | `PaginatedResponse<Quote>` |
| `GET /quote/{id}` (single) | `Quote` — unwrapped |

This unwrapping is intentional: callers requesting a single resource should receive that resource, not a pagination wrapper with one element.

### Endpoint mapping

| SDK method | HTTP | Notes |
|------------|------|-------|
| `client.movies.list(options?)` | `GET /movie` | Supports filter, sort, pagination |
| `client.movies.get(id)` | `GET /movie/{id}` | Unwraps single item |
| `client.movies.quotes(movieId, options?)` | `GET /movie/{id}/quote` | Nested resource |
| `client.quotes.list(options?)` | `GET /quote` | Supports filter, sort, pagination |
| `client.quotes.get(id)` | `GET /quote/{id}` | Unwraps single item |

### Convenience methods (non-mirror abstractions)

The assessment allows SDK methods that do not map 1:1 to a single endpoint:

| SDK method | Behavior |
|------------|----------|
| `movies.listAll(options?)` | Repeated `list()` calls until all pages are retrieved |
| `movies.quotesByName(name)` | `movies.list({ filter: { name }, limit: 1 })` then `movies.quotes(movieId)` |

These combine API calls for ergonomics but do not cache or precompute data locally.

---

## 3. Architecture

### Layer diagram

```
┌─────────────────────────────────────────────────┐
│  Public API (src/index.ts)                      │
│  LotrClient, types, errors                      │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Resources (src/resources/)                     │
│  MoviesResource, QuotesResource, BaseResource   │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│ query-builder │         │  HttpClient   │
│ (pure)        │         │  (transport)  │
└───────────────┘         └───────┬───────┘
                                  ▼
                          the-one-api.dev/v2
```

### Module responsibilities

| Module | Responsibility |
|--------|----------------|
| `LotrClient` | Facade; resolves config; wires resource instances |
| `MoviesResource` / `QuotesResource` | Domain paths and resource-specific methods |
| `BaseResource` | Shared `list()`, `get()`, `listAll()` |
| `HttpClient` | Auth headers, timeouts, JSON parsing, error mapping |
| `query-builder` | Converts typed options to URL query strings |
| `types/` | `Movie`, `Quote`, filters, pagination shapes |
| `errors/` | Typed exception hierarchy |

### Request flow example

```
client.movies.list({ filter: { runtimeInMinutes: { gte: 160 } }, limit: 5 })
  → MoviesResource.list("/movie", options)
  → query-builder.buildQueryString(options)
      → "?runtimeInMinutes>=160&limit=5"
  → HttpClient.get("/movie", options)
      → GET https://the-one-api.dev/v2/movie?runtimeInMinutes>=160&limit=5
  → PaginatedResponse<Movie>
```

---

## 4. Public API design

### Client construction

```typescript
import { LotrClient } from 'lotr-sdk';

const client = new LotrClient({
  apiKey: string;        // required
  baseUrl?: string;      // default: https://the-one-api.dev/v2
  timeoutMs?: number;    // default: 10000
  fetch?: typeof fetch;  // injectable for tests
});
```

### Resource layout

```typescript
client.movies.list(options?)
client.movies.get(id)
client.movies.quotes(movieId, options?)
client.movies.quotesByName(name)

client.quotes.list(options?)
client.quotes.get(id)
```

Resources are exposed as `readonly` properties on the client. This pattern scales to future resources:

```typescript
// Future extension — no changes to HTTP or query layers
client.books.list()
client.characters.get(id)
```

### Exported surface

The package entry point (`src/index.ts`) exports only what consumers need:

- `LotrClient`, `LotrClientOptions`
- Types: `Movie`, `Quote`, `PaginatedResponse`, filter and list option types
- Errors: `LotrError`, `AuthenticationError`, `NotFoundError`, `RateLimitError`, `ApiError`

Internal modules (`http/`, `resources/base-resource.ts`) are not exported.

---

## 5. Filtering

### Requirement

The assessment requires filtering support. The One API implements filters as **MongoDB-style query parameters** embedded in the URL, not as a JSON filter body.

Examples from the API:

| Intent | Query parameter |
|--------|-----------------|
| Exact match | `name=Gandalf` |
| Greater or equal | `runtimeInMinutes>=160` |
| Greater than | `academyAwardWins>0` |
| Regex | `name=/Fellowship/i` |
| Sort | `sort=name:asc` |

### SDK filter API

Filters are expressed as typed objects and compiled by `query-builder.ts`:

```typescript
await client.movies.list({
  page: 1,
  limit: 10,
  sort: { name: 'asc' },
  filter: {
    runtimeInMinutes: { gte: 160 },
    academyAwardWins: { gt: 0 },
    name: /Fellowship/i,
  },
});
```

Comparison filters accept either a number (equality) or an object with `gt`, `gte`, `lt`, `lte`, or `ne`.

### Escape hatch

Not every Mongo-style expression is modeled. The `filter.raw` field passes parameters through verbatim for advanced use:

```typescript
filter: {
  name: 'Frodo',
  raw: { race: 'Hobbit,Human' },
}
```

### Design rationale

| Alternative | Why not chosen |
|-------------|----------------|
| Raw query string pass-through | No type safety; leaks API syntax to callers |
| OpenAPI Generator | Assessment forbids it; Mongo-style params are awkward in OpenAPI schemas |
| Third-party query library (`qs`) | Unnecessary dependency for ~80 lines of logic |

---

## 6. Error handling

HTTP failures and empty single-resource responses map to typed errors:

```
LotrError (base)
├── AuthenticationError   — 401 / unauthorized
├── NotFoundError         — missing resource (empty docs on get)
├── RateLimitError        — 429
└── ApiError              — other HTTP failures; includes status and body
```

Callers can handle failures by type rather than inspecting raw response objects:

```typescript
try {
  await client.movies.get(id);
} catch (error) {
  if (error instanceof NotFoundError) { /* ... */ }
  if (error instanceof AuthenticationError) { /* ... */ }
}
```

`HttpClient` also enforces request timeouts and throws `ApiError` on timeout abort.

---

## 7. Extensibility

### Adding a new resource

The assessment asks for an SDK written as if all endpoints will eventually be implemented. The extension path is deliberate and small:

1. Define types in `src/types/<resource>.ts`
2. Create `src/resources/<resource>.ts` extending `BaseResource`
3. Add `readonly <resource>: <Resource>Resource` to `LotrClient`
4. Export public types from `src/index.ts`

No changes are required to `HttpClient` or `query-builder` unless the new resource introduces novel filter shapes.

### BaseResource contract

```typescript
abstract class BaseResource<T, TFilter> {
  list(options?): Promise<PaginatedResponse<T>>
  get(id: string): Promise<T>
  listAll(options?): Promise<T[]>
}
```

`MoviesResource` adds domain-specific methods (`quotes`, `quotesByName`). `QuotesResource` uses the base contract only. Future resources follow the same pattern.

---

## 8. Testing

### Strategy

| Layer | What is tested | How |
|-------|----------------|-----|
| `query-builder` | Filter, sort, pagination serialization | Pure unit tests |
| `HttpClient` | Auth header, error mapping, timeout | Mocked `fetch` |
| `MoviesResource` / `QuotesResource` | Paths, unwrapping, nested routes | Mocked `fetch` + JSON fixtures |
| Demo (`demo/demo.ts`) | End-to-end against live API | Manual; requires API key |

Tests do not hit the network in CI. Fixtures under `tests/fixtures/` mirror documented API response shapes.

### Running tests

```bash
npm test
```

---

## 9. Production considerations

| Concern | Approach |
|---------|----------|
| **Secrets** | API key passed via config; `.env` for local demo only; never committed |
| **Timeouts** | Configurable `timeoutMs` (default 10s) |
| **Rate limits** | API enforces 100 requests / 10 minutes; `listAll` issues multiple requests — documented in README |
| **Dependencies** | Zero runtime dependencies; native `fetch` (Node 18+) |
| **Observability** | Injectable `fetch` allows wrapping with logging or metrics in consumer code |
| **Versioning** | Semantic versioning intended for internal or assessment use; not published publicly per assessment guidelines |

### Intentionally omitted (v1)

- **Caching** — adds staleness and duplicates server-side filter logic. Consumers may wrap calls with their own cache.
- **Automatic retries** — would need backoff policy and idempotency analysis; noted as future enhancement.
- **Logging** — left to consumers via custom `fetch` wrapper.

---

## 10. Known API behaviors

| Behavior | SDK handling |
|----------|--------------|
| Single GET returns `{ docs: [item], ... }` | Unwrapped in `get()` |
| Quotes include both `_id` and `id` (same value) | Both fields on `Quote` type; `_id` treated as canonical |
| `/movie/{id}/quote` works for LotR trilogy films only | Documented in README; no client-side special casing |
| Invalid ID returns `{ success: false, message: "..." }` | Mapped to `ApiError` or `NotFoundError` based on context |
| Unauthenticated requests return 401 | `AuthenticationError` |
| Server-side `sort` on `/movie` and `/quote` is mostly broken (live probe, 2026-06) | Sort applied **client-side**; `sort` is stripped from the API request |

**Resource schemas** (verified against live API):

| Resource | Fields | SDK type |
|----------|--------|----------|
| **Movie** | `_id`, `name`, `runtimeInMinutes`, `budgetInMillions`, `boxOfficeRevenueInMillions`, `academyAwardNominations`, `academyAwardWins`, `rottenTomatoesScore` | `Movie` ✓ |
| **Quote** | `_id`, `id`, `dialog`, `movie`, `character` | `Quote` ✓ |
| **Character** (future) | `_id`, `name`, `race`, `gender`, `birth`, `death`, `realm`, `spouse`, `hair`, `height`, `wikiUrl` | not in v1 |

**Server-side sort by field** (HTTP 200 only): `_id` works on movie/quote/character; `name` works on character only; all other documented fields return 500 on live API.

**Practical sort for v1:** movies — client-side on `name`, `runtimeInMinutes`, `rottenTomatoesScore`, etc.; quotes — client-side on `dialog`; `movie` / `character` sort by ObjectId string. `MovieListOptions.sort` / `QuoteListOptions.sort` are typed to `keyof Movie` / `keyof Quote`.

**Live sort behavior** (verified against live API):

| Endpoint | No `sort` | With `sort` |
|----------|-----------|-------------|
| `GET /movie?limit=3` | 200 | `sort=name:asc` → **500** |
| `GET /quote?limit=3` | 200 | `sort=character:desc` → **500** (documented example, but broken) |
| `GET /character?limit=3` | 200 | `sort=name:asc` → **200** |

`/book` and `/character` accept server-side sort per API docs; `/movie` and `/quote` do not on the live service despite docs showing sort params for quotes.

---

## 11. Assessment requirements mapping

This section maps the take-home criteria to concrete deliverables in this repository.

| Requirement | How it is addressed |
|-------------|---------------------|
| **Code quality and readability** | Layered modules, strict TypeScript, consistent naming, small focused files |
| **Filtering** | Typed `filter` objects + `query-builder` for Mongo-style params (Section 5) |
| **Testing suite** | Vitest; 30 unit tests across query builder, HTTP client, client-sort, and resources |
| **Architecture, testing, documentation** | This document, README, and test layout |
| **Extensibility** | Resource-oriented design + `BaseResource` (Section 7) |
| **README for SDK users** | `README.md` — install, usage, API reference, test/demo commands |
| **Abstractions beyond API mirror** | `listAll`, `quotesByName`, unwrapped `get()`, typed errors (Section 2) |
| **Production readiness** | Config validation, timeouts, typed errors, no secrets in repo (Section 9) |
| **Demo with instructions** | `demo/demo.ts`; run via `npm run demo` (loads `.env` locally) |
| **design.md** | This document |
| **No OpenAPI Generator** | Hand-written types and resources |

---

## 12. Repository layout

```
src/
├── index.ts              # public exports
├── client.ts             # LotrClient facade
├── config.ts             # options and defaults
├── http/
│   ├── http-client.ts
│   ├── query-builder.ts
│   └── client-sort.ts
├── resources/
│   ├── base-resource.ts
│   ├── movies.ts
│   └── quotes.ts
├── types/
└── errors/
tests/                    # unit tests + fixtures
demo/
│   ├── demo.ts           # local demonstration
│   └── diagnose.ts       # live API smoke checks
design.md                 # this document
README.md                 # user-facing documentation
```
