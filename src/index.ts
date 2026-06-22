export { LotrClient, type LotrClientOptions } from './client.js';

export type { Movie } from './types/movie.js';
export type { Quote } from './types/quote.js';
export type {
  PaginatedResponse,
  PaginationOptions,
  SortDirection,
  SortOptions,
  ListOptions,
} from './types/pagination.js';
export type {
  ComparisonFilter,
  MovieFilters,
  QuoteFilters,
  MovieListOptions,
  QuoteListOptions,
} from './types/filters.js';

export {
  LotrError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ApiError,
} from './errors/index.js';

export { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from './config.js';
