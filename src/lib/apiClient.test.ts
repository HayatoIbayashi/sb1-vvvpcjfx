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

  it('builds admin movie mutation requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ id: 'movie-2', ok: true, deleted: true }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    const payload = {
      title: 'New title',
      description: 'desc',
      price: 1200,
      rental_price: 500,
      genre: ['Action'],
      cast: ['Actor A'],
    };

    await client.createAdminMovie(payload);
    await client.updateAdminMovie('movie-2', payload);
    await client.deleteAdminMovie('movie-2');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/movies',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/movies/movie-2',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/admin/movies/movie-2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('builds admin user requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ items: [], id: 'user-1', ok: true, deleted: true }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getAdminUsers({ q: 'sample', status: 'active', limit: 20 });
    await client.updateAdminUser('user-1', { status: 'suspended', prefecture: 'Tokyo' });
    await client.deleteAdminUser('user-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/users?q=sample&status=active&limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/users/user-1',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/admin/users/user-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('builds admin account requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ items: [], id: 'admin-1', ok: true, deleted: true }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getAdminAccounts({ q: 'ops', role: 'super_admin', limit: 10 });
    await client.createAdminAccount({
      email: 'admin@example.com',
      name: '運営管理者',
      password: 'Password123!',
      role: 'admin',
    });
    await client.updateAdminAccount('admin-1', {
      email: 'admin@example.com',
      name: 'スーパー管理者',
      role: 'super_admin',
    });
    await client.deleteAdminAccount('admin-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/admin-users?q=ops&role=super_admin&limit=10',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/admin-users',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/admin/admin-users/admin-1',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/admin/admin-users/admin-1',
      expect.objectContaining({ method: 'DELETE' }),
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

  it('builds watch history requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ ok: true, item: null, items: [] }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getWatchHistory({ limit: 5, offset: 2 });
    await client.addWatchHistory('movie-3');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/watch-history?limit=5&offset=2',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/watch-history',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ movieId: 'movie-3' }),
      }),
    );
  });

  it('builds billing portal session request with auth override', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ url: 'https://billing.stripe.com/session/test' }));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.createBillingPortalSession({ returnUrl: 'https://example.com/account' }, 'id-token-value');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/billing-portal/session',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer id-token-value',
        }),
        body: JSON.stringify({ returnUrl: 'https://example.com/account' }),
      }),
    );
  });

  it('builds subscription current request', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ active: false, subscription: null }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getSubscriptionCurrent();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscriptions/current',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('builds subscription plan and checkout session requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ items: [], url: 'https://checkout.stripe.com/pay/cs_test_123', sessionId: 'cs_test_123' }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getSubscriptionPlans();
    await client.createSubscriptionCheckoutSession({ plan_id: 'plan-1' }, 'id-token-value');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/subscription-plans',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/subscriptions/checkout-session',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer id-token-value',
        }),
        body: JSON.stringify({ plan_id: 'plan-1' }),
      }),
    );
  });

  it('builds subscription cancel request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ active: false, subscription: null }));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.cancelSubscriptionCurrent('id-token-value');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscriptions/current',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer id-token-value',
        }),
      }),
    );
  });

  it('builds profile requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({
        id: 'user-1',
        email: 'user@example.com',
        gender: null,
        age: null,
        prefecture: null,
        created_at: null,
        updated_at: null,
      }),
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = createApiClient({ baseUrl: '/api' });
    await client.getProfile();
    await client.updateProfile({
      displayName: 'New Name',
      email: 'new@example.com',
      gender: 'male',
      age: 30,
      prefecture: 'Tokyo',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/profile',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/profile',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          displayName: 'New Name',
          email: 'new@example.com',
          gender: 'male',
          age: 30,
          prefecture: 'Tokyo',
        }),
      }),
    );
  });
});
