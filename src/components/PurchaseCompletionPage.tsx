import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStatus } from '../lib/authBridge';
import { normalizeReturnTo } from '../lib/subscriptionNavigation';
import useApiClient from '../lib/useApiClient';

const PURCHASE_CONFIRM_RETRY_MS = 1500;
const PURCHASE_CONFIRM_MAX_ATTEMPTS = 8;

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function PurchaseCompletionPage() {
  const api = useApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStatus();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returnTo = useMemo(
    () => normalizeReturnTo(searchParams.get('returnTo')),
    [searchParams],
  );
  const movieId = useMemo(() => {
    const raw = searchParams.get('movieId');
    const trimmed = raw?.trim() ?? '';
    return trimmed || null;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const confirmPurchase = async () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }

      if (!movieId) {
        setError('購入対象の作品情報が不足しています。');
        return;
      }

      setError(null);
      setAttempt(0);

      for (let nextAttempt = 1; nextAttempt <= PURCHASE_CONFIRM_MAX_ATTEMPTS; nextAttempt += 1) {
        try {
          const result = await api.getPurchases({ movieId, status: 'completed', limit: 1 });
          if (cancelled) return;

          if (result.items.length > 0) {
            navigate(returnTo, { replace: true });
            return;
          }
        } catch (purchaseError) {
          console.error('Error confirming purchase status:', purchaseError);
        }

        if (nextAttempt < PURCHASE_CONFIRM_MAX_ATTEMPTS) {
          setAttempt(nextAttempt);
          await wait(PURCHASE_CONFIRM_RETRY_MS);
          if (cancelled) return;
        }
      }

      if (!cancelled) {
        setError('購入完了の反映に時間がかかっています。しばらくしてからご確認ください。');
      }
    };

    void confirmPurchase();

    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, movieId, navigate, returnTo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-amber-400/20 bg-gray-800/90 p-8 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">
          Purchase
        </p>
        <h1 className="mt-4 text-3xl font-bold">購入状態を確認しています</h1>
        <p className="mt-4 text-sm leading-7 text-gray-300">
          Stripeでの決済完了後、作品の購入状態が反映されるまで少しお待ちください。
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
              確認中{attempt > 0 ? ` (${attempt + 1}/${PURCHASE_CONFIRM_MAX_ATTEMPTS})` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
