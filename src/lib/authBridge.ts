import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

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

export async function logoutLocally(
  auth: AuthWithRemoveUser,
  redirectToHome: () => void = () => {
    window.location.replace('/');
  },
) {
  await auth.removeUser?.();
  redirectToHome();
}

export function getBillingToken(auth: ReturnType<typeof useAuth>): string | null {
  const { idToken } = getUserTokens(auth);
  return idToken;
}

export function getBestToken(auth: ReturnType<typeof useAuth>): string | null {
  const { accessToken, idToken } = getUserTokens(auth);
  if (accessToken) return accessToken;
  if (idToken) return idToken;
  return null;
}

export function useAuthStatus() {
  const auth = useAuth();

  const actions = useMemo(() => ({
    loginHosted: () => auth.signinRedirect(),
    logoutAll: () => {
      void logoutLocally(auth);
    },
  }), [auth]);

  return { isAuthenticated: auth.isAuthenticated, ...actions };
}
