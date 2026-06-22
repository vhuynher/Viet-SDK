import { clientSortDocs, omitSort } from '../http/client-sort.js';
import type { HttpClient } from '../http/http-client.js';
import type { QuoteFilters, QuoteListOptions } from '../types/filters.js';
import type { PaginatedResponse } from '../types/pagination.js';
import type { Quote } from '../types/quote.js';
import { BaseResource } from './base-resource.js';

export class QuotesResource extends BaseResource<Quote, QuoteFilters> {
  constructor(http: HttpClient) {
    super(http, 'Quote', '/quote');
  }

  async list(options?: QuoteListOptions): Promise<PaginatedResponse<Quote>> {
    const { options: apiOptions, sort } = omitSort(options);
    const response = await super.list(apiOptions);
    return { ...response, docs: clientSortDocs(response.docs, sort) };
  }

  async listAll(
    options?: Omit<QuoteListOptions, 'page' | 'limit' | 'offset'>,
  ): Promise<Quote[]> {
    const { options: apiOptions, sort } = omitSort(options);
    const all = await super.listAll(apiOptions);
    return clientSortDocs(all, sort);
  }
}
