import { NotFoundError } from '../errors/index.js';
import type { MovieFilters, QuoteFilters } from '../types/filters.js';
import type { HttpClient } from '../http/http-client.js';
import type { ListOptions, PaginatedResponse } from '../types/pagination.js';

type ResourceFilter = MovieFilters | QuoteFilters;

export abstract class BaseResource<T, TFilter extends ResourceFilter = ResourceFilter> {
  constructor(
    protected readonly http: HttpClient,
    protected readonly resourceName: string,
    protected readonly basePath: string,
  ) {}

  async list(options?: ListOptions<TFilter>): Promise<PaginatedResponse<T>> {
    return this.http.get<PaginatedResponse<T>>(this.basePath, options as ListOptions<ResourceFilter>);
  }

  async get(id: string): Promise<T> {
    const response = await this.http.get<PaginatedResponse<T>>(`${this.basePath}/${id}`);
    const item = response.docs[0];

    if (!item) {
      throw new NotFoundError(this.resourceName, id);
    }

    return item;
  }

  async listAll(
    options?: Omit<ListOptions<TFilter>, 'page' | 'limit' | 'offset'>,
  ): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    let pages = 1;

    do {
      const response = await this.list({
        ...options,
        page,
        limit: 100,
      } as ListOptions<TFilter>);

      all.push(...response.docs);
      pages = response.pages;
      page += 1;
    } while (page <= pages);

    return all;
  }
}
