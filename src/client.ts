import { resolveConfig, type LotrClientOptions } from './config.js';
import { HttpClient } from './http/http-client.js';
import { MoviesResource } from './resources/movies.js';
import { QuotesResource } from './resources/quotes.js';

export class LotrClient {
  readonly movies: MoviesResource;
  readonly quotes: QuotesResource;

  constructor(options: LotrClientOptions) {
    const config = resolveConfig(options);
    const http = new HttpClient(config);

    this.movies = new MoviesResource(http);
    this.quotes = new QuotesResource(http);
  }
}

export type { LotrClientOptions } from './config.js';
