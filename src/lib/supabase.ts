const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type SignUpArgs = { email: string; password: string };

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return undefined;
}

export const supabase = {
  auth: {
    async signUp({ email, password }: SignUpArgs) {
      try {
        await post('/auth/signup', { email, password });
        return { data: { user: { id: '' } }, error: null } as const;
      } catch (error) {
        return { data: { user: null }, error: error as Error } as const;
      }
    },
    async resetPasswordForEmail(email: string) {
      try {
        await post('/auth/reset-password', { email });
        return { error: null } as const;
      } catch (error) {
        return { error: error as Error } as const;
      }
    },
    // getSession はフロントでは Lambda 側へ委譲するため未実装
    async getSession() {
      return { data: { session: null } } as const;
    },
  },
  from(table: string) {
    return {
      async upsert(payload: unknown) {
        try {
          await post(`/${table}/upsert`, payload);
          return { error: null } as const;
        } catch (error) {
          return { error: error as Error } as const;
        }
      },
      async insert(payload: unknown) {
        try {
          await post(`/${table}/insert`, payload);
          return { error: null } as const;
        } catch (error) {
          return { error: error as Error } as const;
        }
      },
      async update(payload: unknown) {
        try {
          await post(`/${table}/update`, payload);
          return { error: null } as const;
        } catch (error) {
          return { error: error as Error } as const;
        }
      },
      eq() {
        // チェーン対応のダミー（バックエンドで処理するためここでは無視）
        return this;
      },
    };
  },
};
