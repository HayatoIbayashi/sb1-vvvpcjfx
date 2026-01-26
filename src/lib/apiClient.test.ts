import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './apiClient';

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });

describe('apiClient movies', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('builds movies list request with query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getMovies({ q: 'test', limit: 10, offset: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/movies?q=test&limit=10&offset=5',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('builds admin movies list request with query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getAdminMovies({ q: 'admin', limit: 50 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/movies?q=admin&limit=50',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('builds movie detail request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'movie-1' }));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getMovie('movie-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/movies/movie-1',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('builds admin movie detail request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'movie-2' }));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getAdminMovie('movie-2');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/movies/movie-2',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
