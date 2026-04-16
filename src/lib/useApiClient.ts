import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApiClient } from './apiClient';
import { getBestToken } from './authBridge';

export function useApiClient() {
  const auth = useAuth();
  const getToken = useCallback(async () => getBestToken(auth), [auth]);

  return useMemo(() => createApiClient({ getToken }), [getToken]);
}

export default useApiClient;
