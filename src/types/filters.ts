import type { ListOptions, SortDirection } from './pagination.js';
import type { Movie } from './movie.js';
import type { Quote } from './quote.js';

export type ComparisonFilter =
  | number
  | {
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
      ne?: number;
    };

export type RawFilter = Record<string, string | number | boolean>;

export interface MovieFilters {
  name?: string | RegExp;
  runtimeInMinutes?: ComparisonFilter;
  budgetInMillions?: ComparisonFilter;
  boxOfficeRevenueInMillions?: ComparisonFilter;
  academyAwardNominations?: ComparisonFilter;
  academyAwardWins?: ComparisonFilter;
  rottenTomatoesScore?: ComparisonFilter;
  raw?: RawFilter;
}

export interface QuoteFilters {
  dialog?: string | RegExp;
  movie?: string;
  character?: string;
  raw?: RawFilter;
}

export type MovieListOptions = Omit<ListOptions<MovieFilters>, 'sort'> & {
  /** Applied client-side on /movie — API returns 500 for sort on all fields except `_id`. */
  sort?: Partial<Record<keyof Movie, SortDirection>>;
};

export type QuoteListOptions = Omit<ListOptions<QuoteFilters>, 'sort'> & {
  /** Applied client-side on /quote — API returns 500 for sort on all fields except `_id`. */
  sort?: Partial<Record<keyof Quote, SortDirection>>;
};
