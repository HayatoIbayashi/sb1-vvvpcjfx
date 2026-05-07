/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  AUTH_STORAGE_KEY,
  clearOidcArtifacts,
  clearStoredTokens,
  decodeJwtPayload,
  hasExpiredTokens,
  readStoredTokens,
  writeStoredTokens,
  type AuthProfile,
  type StoredTokens,
} from '../lib/authStorage';

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
  setTokens: (tokens: StoredTokens | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function buildUser(tokens: StoredTokens | null): AuthUser | null {
  if (!tokens?.id_token && !tokens?.access_token) {
    return null;
  }

  return {
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    refresh_token: tokens.refresh_token,
    profile: decodeJwtPayload(tokens.id_token ?? tokens.access_token),
  };
}

function readActiveTokens(): StoredTokens | null {
  const tokens = readStoredTokens();
  if (!tokens) return null;

  if (hasExpiredTokens(tokens)) {
    clearStoredTokens();
    clearOidcArtifacts();
    return null;
  }

  return tokens;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokensState] = useState<StoredTokens | null>(() => readActiveTokens());

  const syncFromStorage = useCallback(() => {
    setTokensState(readActiveTokens());
  }, []);

  const setTokens = useCallback((nextTokens: StoredTokens | null) => {
    if (nextTokens?.id_token || nextTokens?.access_token || nextTokens?.refresh_token) {
      writeStoredTokens(nextTokens);
      setTokensState(readActiveTokens());
      return;
    }

    clearStoredTokens();
    clearOidcArtifacts();
    setTokensState(null);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== AUTH_STORAGE_KEY) {
        return;
      }
      syncFromStorage();
    };

    const handleFocus = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncFromStorage]);

  const removeUser = useCallback(async () => {
    setTokens(null);
  }, [setTokens]);

  const signoutRedirect = useCallback(async () => {
    setTokens(null);
    window.location.assign('/');
  }, [setTokens]);

  const signinRedirect = useCallback(async () => {
    window.location.assign('/login');
  }, []);

  const value = useMemo<AuthContextType>(() => {
    const user = buildUser(tokens);

    return {
      user,
      isAuthenticated: !!user,
      isLoading: false,
      error: null,
      signinRedirect,
      signoutRedirect,
      removeUser,
      setTokens,
    };
  }, [removeUser, setTokens, signinRedirect, signoutRedirect, tokens]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
