import { useMemo } from 'react';
import { useAuth } from 'react-oidc-context';

type StoredTokens = {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
};

type AuthUserWithTokens = {
  access_token?: string;
  accessToken?: string;
  id_token?: string;
  idToken?: string;
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
  } catch {
    return;
  }
}

export function getBestToken(auth: ReturnType<typeof useAuth>): string | null {
  // 優先順位: OIDC access_token -> OIDC id_token -> localStorage access_token -> localStorage id_token
  const user = auth.user as (typeof auth.user & AuthUserWithTokens) | null;
  const access = user?.access_token ?? user?.accessToken;
  const idt = user?.id_token ?? user?.idToken;
  if (access) return access;
  if (idt) return idt;
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
