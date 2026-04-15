import { useEffect, useState } from 'react';
import { useAuthStatus } from './authBridge';
import useApiClient from './useApiClient';

export const MEMBERSHIP_MONTHLY_PRICE = 1000;

export type MembershipAccessState = 'guest' | 'registered' | 'member';

export function useMembershipStatus() {
  const api = useApiClient();
  const { isAuthenticated } = useAuthStatus();
  const [accessState, setAccessState] = useState<MembershipAccessState>(
    isAuthenticated ? 'registered' : 'guest',
  );
  const [isLoading, setIsLoading] = useState(isAuthenticated);

  useEffect(() => {
    let cancelled = false;

    const loadMembershipStatus = async () => {
      if (!isAuthenticated) {
        if (!cancelled) {
          setAccessState('guest');
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        const result = await api.getSubscriptionCurrent();
        if (!cancelled) {
          setAccessState(result.active ? 'member' : 'registered');
        }
      } catch (error) {
        console.error('Error fetching membership status:', error);
        if (!cancelled) {
          setAccessState('registered');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMembershipStatus();

    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated]);

  return { accessState, isLoading };
}
