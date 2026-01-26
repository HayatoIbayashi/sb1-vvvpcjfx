import type { Database } from './types';

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type Movie = Database['public']['Tables']['movies']['Row'];

export type SignUpPayload = {
  email: string;
  password: string;
  gender?: string | null;
  age?: number;
  prefecture?: string | null;
  displayName?: string | null;
};

export type GetTokenFn = () => Promise<string | null> | string | null;

export type CreateApiClientOptions = {
  baseUrl?: string;
  getToken?: GetTokenFn;
};

function buildHeaders(base: HeadersInit = {}, authToken?: string | null): HeadersInit {
  if (!authToken) return base;
  return { ...(base as Record<string, string>), Authorization: `Bearer ${authToken}` };
}

function createRequester(baseUrl: string, getToken?: GetTokenFn) {
  return async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken ? await getToken() : null;
    const headers = buildHeaders({ 'Content-Type': 'application/json', ...(options.headers || {}) }, token);
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || `Request failed: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return (await res.json()) as T;
    // @ts-ignore allow empty body
    return undefined as T;
  };
}

export function createApiClient(opts: CreateApiClientOptions = {}) {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const request = createRequester(baseUrl, opts.getToken);

  return {
    signUp(payload: SignUpPayload) {
      return request<void>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
    },
    getMovies(query?: { q?: string; limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (query?.q) qs.set('q', query.q);
      if (query?.limit != null) qs.set('limit', String(query.limit));
      if (query?.offset != null) qs.set('offset', String(query.offset));
      const suffix = qs.toString();
      return request<{ items: Movie[] }>(`/movies${suffix ? `?${suffix}` : ''}`, { method: 'GET' });
    },
    getMovie(id: string) {
      return request<Movie>(`/movies/${encodeURIComponent(id)}`, { method: 'GET' });
    },
    getAdminMovies(query?: { q?: string; limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (query?.q) qs.set('q', query.q);
      if (query?.limit != null) qs.set('limit', String(query.limit));
      if (query?.offset != null) qs.set('offset', String(query.offset));
      const suffix = qs.toString();
      return request<{ items: Movie[] }>(`/admin/movies${suffix ? `?${suffix}` : ''}`, { method: 'GET' });
    },
    getAdminMovie(id: string) {
      return request<Movie>(`/admin/movies/${encodeURIComponent(id)}`, { method: 'GET' });
    },
    getWatchlist() {
      return request<{ items: Movie[] }>('/watchlist', { method: 'GET' });
    },
    addToWatchlist(movieId: string) {
      return request<{ ok: true; added: boolean }>(
        '/watchlist',
        { method: 'POST', body: JSON.stringify({ movieId }) },
      );
    },
    removeFromWatchlist(movieId: string) {
      return request<{ ok: true; deleted: boolean }>(
        `/watchlist/${encodeURIComponent(movieId)}`,
        { method: 'DELETE' },
      );
    },
    getPurchases(query?: { status?: string; limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (query?.status) qs.set('status', query.status);
      if (query?.limit != null) qs.set('limit', String(query.limit));
      if (query?.offset != null) qs.set('offset', String(query.offset));
      const suffix = qs.toString();
      return request<{ items: PurchaseItem[] }>(`/purchases${suffix ? `?${suffix}` : ''}`, { method: 'GET' });
    },
    getPurchase(id: string) {
      return request<PurchaseItem>(`/purchases/${encodeURIComponent(id)}`, { method: 'GET' });
    },
    resetPassword(email: string) {
      return request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) });
    },
    createPaymentIntent(movieId: string, amount: number) {
      return request<{ clientSecret: string }>(
        '/payments/create-intent',
        { method: 'POST', body: JSON.stringify({ movieId, amount }) },
      );
    },
    // Reviews
    getReviews(movieId: string) {
      const qs = new URLSearchParams({ movieId }).toString();
      return request<{ items: Review[] }>(`/reviews?${qs}`, { method: 'GET' });
    },
    addReview(movieId: string, rating: number, comment: string) {
      return request<void>('/reviews', {
        method: 'POST',
        body: JSON.stringify({ movieId, rating, comment }),
      });
    },
    request,
  };
}

export const apiClient = createApiClient();
export default apiClient;

export type Review = {
  id: string;
  movieId: string;
  userId: string;
  displayName: string | null;
  rating: number; // 1..5
  comment: string;
  createdAt: string; // ISO timestamp
};

export type PurchaseItem = {
  id: string;
  movie_id: string;
  payment_method: string;
  amount_total: number;
  amount_cash: number;
  amount_points: number;
  status: string;
  expires_at: string | null;
  created_at: string;
  title: string;
};
