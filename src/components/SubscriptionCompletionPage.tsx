import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStatus } from '../lib/authBridge';
import {
  DEFAULT_MEMBERSHIP_RETURN_TO,
  normalizeReturnTo,
} from '../lib/subscriptionNavigation';
import useApiClient from '../lib/useApiClient';

const MEMBERSHIP_CONFIRM_RETRY_MS = 1500;
const MEMBERSHIP_CONFIRM_MAX_ATTEMPTS = 8;

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function SubscriptionCompletionPage() {
  const api = useApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStatus();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const returnTo = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return normalizeReturnTo(
      searchParams.get('returnTo'),
      DEFAULT_MEMBERSHIP_RETURN_TO,
    );
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const confirmMembership = async () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }

      setError(null);
      setAttempt(0);

      for (let nextAttempt = 1; nextAttempt <= MEMBERSHIP_CONFIRM_MAX_ATTEMPTS; nextAttempt += 1) {
        try {
          const result = await api.getSubscriptionCurrent();
          if (cancelled) return;

          if (result.active) {
            navigate(returnTo, { replace: true });
            return;
          }
        } catch (membershipError) {
          console.error('Error confirming membership status:', membershipError);
        }

        if (nextAttempt < MEMBERSHIP_CONFIRM_MAX_ATTEMPTS) {
          setAttempt(nextAttempt);
          await wait(MEMBERSHIP_CONFIRM_RETRY_MS);
          if (cancelled) return;
        }
      }

      if (!cancelled) {
        setError('メンバーシップ登録の反映確認に時間がかかっています。しばらくしてからもう一度お試しください。');
      }
    };

    void confirmMembership();

    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, navigate, returnTo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-amber-400/20 bg-gray-800/90 p-8 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">
          Membership
        </p>
        <h1 className="mt-4 text-3xl font-bold">登録状態を確認しています</h1>
        <p className="mt-4 text-sm leading-7 text-gray-300">
          Stripe での登録完了後、メンバーシップの反映を確認してから元の画面へ戻ります。
        </p>

        {error ? (
          <>
            <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
            <button
              onClick={() => navigate(returnTo, { replace: true })}
              className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
            >
              元の画面へ戻る
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mt-8 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-amber-300" />
            <p className="mt-4 text-sm text-gray-400">
              確認中{attempt > 0 ? ` (${attempt + 1}/${MEMBERSHIP_CONFIRM_MAX_ATTEMPTS})` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
