import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { User } from 'oidc-client-ts';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const oidcAuth = useOidcAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (oidcAuth.isLoading) return;

    if (oidcAuth.error) {
      setError(oidcAuth.error);
      setIsLoading(false);
      return;
    }

    if (oidcAuth.isAuthenticated && oidcAuth.user) {
      setUser(oidcAuth.user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(false);
    setIsLoading(false);
  }, [oidcAuth]);

  const login = async () => {
    try {
      await oidcAuth.signinRedirect();
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await oidcAuth.signoutRedirect();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
