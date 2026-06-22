export interface PaginatedResponse<T> {
  docs: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export type SortDirection = 'asc' | 'desc';
export type SortOptions = Record<string, SortDirection>;

export interface ListOptions<TFilter = undefined> extends PaginationOptions {
  sort?: SortOptions;
  filter?: TFilter;
}
