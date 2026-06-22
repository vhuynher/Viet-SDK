import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../src/http/http-client.js';
import {
  ApiError,
  AuthenticationError,
  RateLimitError,
} from '../src/errors/index.js';

function createClient(fetchImpl: typeof fetch) {
  return new HttpClient({
    apiKey: 'test-key',
    baseUrl: 'https://the-one-api.dev/v2',
    timeoutMs: 5000,
    fetch: fetchImpl,
  });
}

describe('HttpClient', () => {
  it('sends Authorization header and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ docs: [], total: 0 }), { status: 200 }),
    );

    const client = createClient(fetchMock);
    const result = await client.get('/movie');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://the-one-api.dev/v2/movie',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-key',
          Accept: 'application/json',
        },
      }),
    );
    expect(result).toEqual({ docs: [], total: 0 });
  });

  it('appends query string from list options', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ docs: [] }), { status: 200 }),
    );

    const client = createClient(fetchMock);
    await client.get('/movie', {
      filter: { runtimeInMinutes: { gte: 160 } },
      limit: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://the-one-api.dev/v2/movie?limit=5&runtimeInMinutes%3E=160',
      expect.any(Object),
    );
  });

  it('maps 401 to AuthenticationError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Unauthorized.' }), {
        status: 401,
      }),
    );

    const client = createClient(fetchMock);
    await expect(client.get('/movie')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('maps 429 to RateLimitError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Too many requests' }), {
        status: 429,
      }),
    );

    const client = createClient(fetchMock);
    await expect(client.get('/movie')).rejects.toBeInstanceOf(RateLimitError);
  });

  it('maps other errors to ApiError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Something went wrong.' }), {
        status: 500,
      }),
    );

    const client = createClient(fetchMock);
    await expect(client.get('/movie')).rejects.toBeInstanceOf(ApiError);
  });
});
