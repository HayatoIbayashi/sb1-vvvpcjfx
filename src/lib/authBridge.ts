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

function getUserTokens(auth: ReturnType<typeof useAuth>) {
  const user = auth.user as (typeof auth.user & AuthUserWithTokens) | null;
  return {
    accessToken: user?.access_token ?? user?.accessToken ?? null,
    idToken: user?.id_token ?? user?.idToken ?? null,
  };
}

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

export function getBillingToken(auth: ReturnType<typeof useAuth>): string | null {
  const { idToken } = getUserTokens(auth);
  if (idToken) return idToken;
  const stored = getStoredTokens();
  if (stored?.id_token) return stored.id_token;
  return null;
}

export function getBestToken(auth: ReturnType<typeof useAuth>): string | null {
  const { accessToken, idToken } = getUserTokens(auth);
  // Prefer API-oriented access_token first, but keep id_token available for endpoints that need profile claims.
  if (accessToken) return accessToken;
  if (idToken) return idToken;
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
