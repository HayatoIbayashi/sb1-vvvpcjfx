import { useMemo } from 'react';
import { useAuth } from 'react-oidc-context';

type StoredTokens = {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
};

export function getStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem('cognito_tokens');
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function clearStoredTokens() {
  try {
    localStorage.removeItem('cognito_tokens');
  } catch {}
}

export function getBestToken(auth: ReturnType<typeof useAuth>): string | null {
  // 優先順位: OIDC access_token -> OIDC id_token -> localStorage access_token -> localStorage id_token
  const access = (auth.user as any)?.access_token ?? (auth.user as any)?.accessToken ?? auth.user?.access_token;
  const idt = (auth.user as any)?.id_token ?? (auth.user as any)?.idToken ?? auth.user?.id_token;
  if (access) return access as string;
  if (idt) return idt as string;
  const stored = getStoredTokens();
  if (stored?.access_token) return stored.access_token;
  if (stored?.id_token) return stored.id_token;
  return null;
}

export function useAuthStatus() {
  const auth = useAuth();
  const stored = getStoredTokens();
  const isAuthenticated = auth.isAuthenticated || !!stored;

  const actions = useMemo(() => ({
    loginHosted: () => auth.signinRedirect(),
    logoutAll: () => {
      clearStoredTokens();
      auth.signoutRedirect();
    },
  }), [auth]);

  return { isAuthenticated, ...actions };
}

