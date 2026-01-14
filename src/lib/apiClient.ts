const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
