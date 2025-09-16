import { useMemo } from 'react';
import { useAuth } from 'react-oidc-context';
import { createApiClient } from './apiClient';
import { getBestToken } from './authBridge';

export function useApiClient() {
  const auth = useAuth();
  const getToken = async () => getBestToken(auth);

  return useMemo(() => createApiClient({ getToken }), [auth.user]);
}

export default useApiClient;
