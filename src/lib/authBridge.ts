import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

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

type AuthWithRemoveUser = {
  removeUser?: () => Promise<void> | void;
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

export function clearOidcArtifacts() {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (key.startsWith('oidc.user:') || key.startsWith('oidc.')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    return;
  }
}

export async function logoutLocally(
  auth: AuthWithRemoveUser,
  redirectToHome: () => void = () => {
    window.location.replace('/');
  },
) {
  clearStoredTokens();
  clearOidcArtifacts();
  await auth.removeUser?.();
  redirectToHome();
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
      void logoutLocally(auth);
    },
  }), [auth]);

  return { isAuthenticated, ...actions };
}
