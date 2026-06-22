import type { ResolvedConfig } from '../config.js';
import {
  ApiError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from '../errors/index.js';
import { buildQueryString } from './query-builder.js';
import type { MovieFilters, QuoteFilters } from '../types/filters.js';
import type { ListOptions } from '../types/pagination.js';

type QueryOptions = ListOptions<MovieFilters | QuoteFilters>;

interface ApiErrorBody {
  success?: boolean;
  message?: string;
}

export class HttpClient {
  constructor(private readonly config: ResolvedConfig) {}

  async get<T>(path: string, options?: QueryOptions): Promise<T> {
    const query = buildQueryString(options);
    // Normalize encoding (e.g. runtimeInMinutes>=160 → runtimeInMinutes%3E=160)
    const url = new URL(`${this.config.baseUrl}${path}${query}`).href;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.config.fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      const body = await parseJson(response);

      if (!response.ok) {
        throw mapHttpError(response.status, body);
      }

      return body as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, `Request timed out after ${this.config.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(response.status, 'Invalid JSON response from API');
  }
}

function mapHttpError(status: number, body: unknown): Error {
  const message =
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof (body as ApiErrorBody).message === 'string'
      ? (body as ApiErrorBody).message!
      : `API request failed with status ${status}`;

  if (status === 401) {
    return new AuthenticationError(message);
  }
  if (status === 404) {
    return new NotFoundError('Resource', 'unknown');
  }
  if (status === 429) {
    return new RateLimitError(message, status);
  }

  return new ApiError(status, message, body);
}
