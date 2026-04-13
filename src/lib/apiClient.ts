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

export type ProfileResponse = {
  id: string;
  email: string;
  display_name: string | null;
  gender: string | null;
  age: number | null;
  prefecture: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProfileUpdatePayload = {
  email?: string | null;
  displayName?: string | null;
  gender?: string | null;
  age?: number | null;
  prefecture?: string | null;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionCreatePayload = {
  plan_id: string;
};

export type WatchHistoryItem = {
  id: string;
  movie_id: string;
  title: string;
  thumbnail: string | null;
  watched_at: string;
};

export type BillingPortalSessionPayload = {
  returnUrl?: string | null;
};

export type BillingPortalSessionResponse = {
  url: string;
};

export type AdminMovieWritePayload = {
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  thumbnail_top?: string | null;
  thumbnail_detail?: string | null;
  release_date?: string | null;
  duration?: string | null;
  genre?: string[] | null;
  cast?: string[] | null;
  price?: number;
  rental_price?: number;
  is_published?: boolean;
  publish_at?: string | null;
  unpublish_at?: string | null;
  view_window_days?: number;
};

export type AdminUser = {
  id: string;
  email: string;
  gender: string | null;
  age: number | null;
  prefecture: string | null;
  is_member: boolean;
  status: 'active' | 'suspended';
  registered_at: string;
  updated_at: string | null;
};

export type AdminUserUpdatePayload = {
  email?: string | null;
  gender?: string | null;
  age?: number | null;
  prefecture?: string | null;
  status?: 'active' | 'suspended';
};

export type AdminAccountRole = 'admin' | 'super_admin';

export type AdminAccount = {
  id: string;
  email: string;
  name: string | null;
  role: AdminAccountRole;
  enabled: boolean;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminAccountCreatePayload = {
  email: string;
  name?: string | null;
  password: string;
  role: AdminAccountRole;
};

export type AdminAccountUpdatePayload = {
  email: string;
  name?: string | null;
  role: AdminAccountRole;
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
    if (!contentType.includes('application/json')) return undefined as T;
    return (await res.json()) as T;
  };
}

export function createApiClient(opts: CreateApiClientOptions = {}) {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const request = createRequester(baseUrl, opts.getToken);
  const resolveToken = async () => (opts.getToken ? await opts.getToken() : null);

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
    createAdminMovie(payload: AdminMovieWritePayload) {
      return request<Movie>('/admin/movies', { method: 'POST', body: JSON.stringify(payload) });
    },
    updateAdminMovie(id: string, payload: AdminMovieWritePayload) {
      return request<Movie>(`/admin/movies/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    deleteAdminMovie(id: string) {
      return request<{ ok: true; deleted: boolean }>(`/admin/movies/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    getAdminUsers(query?: { q?: string; status?: string; limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (query?.q) qs.set('q', query.q);
      if (query?.status) qs.set('status', query.status);
      if (query?.limit != null) qs.set('limit', String(query.limit));
      if (query?.offset != null) qs.set('offset', String(query.offset));
      const suffix = qs.toString();
      return request<{ items: AdminUser[] }>(`/admin/users${suffix ? `?${suffix}` : ''}`, { method: 'GET' });
    },
    updateAdminUser(id: string, payload: AdminUserUpdatePayload) {
      return request<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    deleteAdminUser(id: string) {
      return request<{ ok: true; deleted: boolean }>(`/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    getAdminAccounts(query?: { q?: string; role?: AdminAccountRole; limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (query?.q) qs.set('q', query.q);
      if (query?.role) qs.set('role', query.role);
      if (query?.limit != null) qs.set('limit', String(query.limit));
      if (query?.offset != null) qs.set('offset', String(query.offset));
      const suffix = qs.toString();
      return request<{ items: AdminAccount[] }>(`/admin/admin-users${suffix ? `?${suffix}` : ''}`, { method: 'GET' });
    },
    createAdminAccount(payload: AdminAccountCreatePayload) {
      return request<AdminAccount>('/admin/admin-users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateAdminAccount(id: string, payload: AdminAccountUpdatePayload) {
      return request<AdminAccount>(`/admin/admin-users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    deleteAdminAccount(id: string) {
      return request<{ ok: true; deleted: boolean }>(`/admin/admin-users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
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
    getWatchHistory(query?: { limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (query?.limit != null) qs.set('limit', String(query.limit));
      if (query?.offset != null) qs.set('offset', String(query.offset));
      const suffix = qs.toString();
      return request<{ items: WatchHistoryItem[] }>(
        `/watch-history${suffix ? `?${suffix}` : ''}`,
        { method: 'GET' },
      );
    },
    addWatchHistory(movieId: string) {
      return request<{ ok: true; item: WatchHistoryItem }>(
        '/watch-history',
        { method: 'POST', body: JSON.stringify({ movieId }) },
      );
    },
    async createBillingPortalSession(
      payload: BillingPortalSessionPayload,
      authTokenOverride?: string | null,
    ) {
      const token = authTokenOverride ?? await resolveToken();
      const headers = buildHeaders({ 'Content-Type': 'application/json' }, token);
      const res = await fetch(`${baseUrl}/billing-portal/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `Request failed: ${res.status}`);
      }
      return (await res.json()) as BillingPortalSessionResponse;
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
    getSubscriptionCurrent() {
      return request<SubscriptionCurrent>('/subscriptions/current', { method: 'GET' });
    },
    getSubscriptionPlans() {
      return request<{ items: SubscriptionPlan[] }>('/subscription-plans', { method: 'GET' });
    },
    subscribeCurrent(payload: SubscriptionCreatePayload) {
      return request<SubscriptionCurrent>('/subscriptions/current', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    cancelSubscriptionCurrent() {
      return request<SubscriptionCurrent>('/subscriptions/current', { method: 'DELETE' });
    },
    getWalletSummary() {
      return request<WalletSummary>('/wallets/current', { method: 'GET' });
    },
    getWalletTransactions(query?: { limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (query?.limit != null) qs.set('limit', String(query.limit));
      if (query?.offset != null) qs.set('offset', String(query.offset));
      const suffix = qs.toString();
      return request<{ items: WalletTransactionItem[] }>(
        `/wallets/transactions${suffix ? `?${suffix}` : ''}`,
        { method: 'GET' },
      );
    },
    getProfile() {
      return request<ProfileResponse>('/profile', { method: 'GET' });
    },
    updateProfile(payload: ProfileUpdatePayload) {
      return request<ProfileResponse>('/profile', { method: 'PUT', body: JSON.stringify(payload) });
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

export type SubscriptionCurrent = {
  active: boolean;
  subscription: {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    started_at: string | null;
    renews_at: string | null;
    canceled_at: string | null;
    ended_at: string | null;
    created_at: string;
    updated_at: string;
    plan_name: string;
    price_monthly: number;
    plan_is_active: boolean;
  } | null;
};

export type WalletSummary = {
  total_points: number;
  paid_points: number;
  bonus_points: number;
  expiring_soon_amount: number;
  expiring_soon_date: string | null;
  expirations: {
    date: string;
    amount: number;
    type: 'paid' | 'bonus';
    note: string | null;
  }[];
};

export type WalletTransactionItem = {
  id: string;
  date: string;
  title: string;
  diff: number;
  type: 'credit' | 'debit';
  balance_after: number;
};
