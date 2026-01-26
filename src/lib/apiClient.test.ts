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

  it('builds watchlist requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ ok: true, added: true, deleted: true, items: [] }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getWatchlist();
    await client.addToWatchlist('movie-3');
    await client.removeFromWatchlist('movie-3');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/watchlist',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/watchlist',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/watchlist/movie-3',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
