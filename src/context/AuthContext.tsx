/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';

type StoredTokens = {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
};

type AuthProfile = {
  email?: string;
  name?: string;
  sub?: string;
  [key: string]: unknown;
};

type AuthUser = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  profile: AuthProfile;
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signinRedirect: () => Promise<void>;
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem('cognito_tokens');
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

function clearStoredTokens() {
  try {
    localStorage.removeItem('cognito_tokens');
  } catch {
    return;
  }
}

function clearOidcArtifacts() {
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

function decodeJwtPayload(token?: string): AuthProfile {
  if (!token) return {};

  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = window.atob(normalized);
    return JSON.parse(decoded) as AuthProfile;
  } catch {
    return {};
  }
}

function buildAuthValue(): AuthContextType {
  const tokens = getStoredTokens();
  const profile = decodeJwtPayload(tokens?.id_token);
  const user = tokens?.id_token || tokens?.access_token
    ? {
        access_token: tokens?.access_token,
        id_token: tokens?.id_token,
        refresh_token: tokens?.refresh_token,
        profile,
      }
    : null;

  return {
    user,
    isAuthenticated: !!user,
    isLoading: false,
    error: null,
    signinRedirect: async () => {
      window.location.assign('/login');
    },
    signoutRedirect: async () => {
      clearStoredTokens();
      clearOidcArtifacts();
      window.location.assign('/');
    },
    removeUser: async () => {
      clearStoredTokens();
      clearOidcArtifacts();
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={buildAuthValue()}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context) {
    return context;
  }
  return buildAuthValue();
}
