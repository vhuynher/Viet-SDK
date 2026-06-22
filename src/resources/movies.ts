import type { HttpClient } from '../http/http-client.js';
import { clientSortDocs, omitSort } from '../http/client-sort.js';
import { NotFoundError } from '../errors/index.js';
import type { MovieFilters, MovieListOptions, QuoteFilters, QuoteListOptions } from '../types/filters.js';
import type { ListOptions } from '../types/pagination.js';
import type { Movie } from '../types/movie.js';
import type { PaginatedResponse } from '../types/pagination.js';
import type { Quote } from '../types/quote.js';
import { BaseResource } from './base-resource.js';

export class MoviesResource extends BaseResource<Movie, MovieFilters> {
  constructor(http: HttpClient) {
    super(http, 'Movie', '/movie');
  }

  async list(options?: MovieListOptions): Promise<PaginatedResponse<Movie>> {
    const { options: apiOptions, sort } = omitSort(options);
    const response = await super.list(apiOptions);
    return { ...response, docs: clientSortDocs(response.docs, sort) };
  }

  async listAll(
    options?: Omit<MovieListOptions, 'page' | 'limit' | 'offset'>,
  ): Promise<Movie[]> {
    const { options: apiOptions, sort } = omitSort(options);
    const all = await super.listAll(apiOptions);
    return clientSortDocs(all, sort);
  }

  async quotes(
    movieId: string,
    options?: QuoteListOptions,
  ): Promise<PaginatedResponse<Quote>> {
    const { options: apiOptions, sort } = omitSort(options);
    const response = await this.http.get<PaginatedResponse<Quote>>(
      `/movie/${movieId}/quote`,
      apiOptions as ListOptions<MovieFilters | QuoteFilters>,
    );
    return { ...response, docs: clientSortDocs(response.docs, sort) };
  }

  async quotesByName(name: string | RegExp): Promise<Quote[]> {
    const movies = await this.list({
      filter: { name },
      limit: 1,
    });

    const movie = movies.docs[0];
    if (!movie) {
      const label = name instanceof RegExp ? name.toString() : name;
      throw new NotFoundError('Movie', label);
    }

    const quotes = await this.quotes(movie._id);
    return quotes.docs;
  }

  /**
   * Random quote from a specific movie (two paginated calls to /movie/{id}/quote).
   * The API has no movie-scoped random endpoint; we pick a random offset.
   */
  async randomQuote(movieId: string): Promise<Quote> {
    const probe = await this.quotes(movieId, { limit: 1 });
    if (probe.total === 0) {
      throw new NotFoundError('Quote', `movie ${movieId}`);
    }

    const offset = Math.floor(Math.random() * probe.total);
    const result = await this.quotes(movieId, { limit: 1, offset });
    const quote = result.docs[0];
    if (!quote) {
      throw new NotFoundError('Quote', `movie ${movieId}`);
    }

    return quote;
  }

  /** Find a movie by name, then return a random quote from that film. */
  async randomQuoteByName(name: string | RegExp): Promise<Quote> {
    const movies = await this.list({
      filter: { name },
      limit: 1,
    });

    const movie = movies.docs[0];
    if (!movie) {
      const label = name instanceof RegExp ? name.toString() : name;
      throw new NotFoundError('Movie', label);
    }

    return this.randomQuote(movie._id);
  }
}
