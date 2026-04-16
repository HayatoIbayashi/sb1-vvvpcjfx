import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, CreditCard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from './common/Header';
import { getBillingToken, useAuthStatus } from '../lib/authBridge';
import {
  buildAbsoluteAppUrl,
  buildSubscriptionCompletionPath,
  buildSubscriptionPath,
  normalizeReturnTo,
} from '../lib/subscriptionNavigation';
import useApiClient from '../lib/useApiClient';
import type { SubscriptionPlan } from '../lib/apiClient';
import { MEMBERSHIP_MONTHLY_PRICE, useMembershipStatus } from '../lib/useMembershipStatus';

const MOCK_MEMBERSHIP_PLAN: SubscriptionPlan = {
  id: 'mock-membership',
  name: 'メンバーシップ',
  description: '全作品が見放題\n視聴はメンバーシップ登録済みアカウントのみ\n請求情報は Stripe のカスタマーポータルで管理',
  price_monthly: MEMBERSHIP_MONTHLY_PRICE,
  stripe_price_id: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function resolveMembershipPlan(plans: SubscriptionPlan[]) {
  const activePlans = plans.filter((plan) => plan.is_active);
  return activePlans.find((plan) => plan.price_monthly === MEMBERSHIP_MONTHLY_PRICE) ?? activePlans[0] ?? null;
}

function toFeatureList(plan: SubscriptionPlan | null) {
  if (!plan) return [];

  const features = (plan.description || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (features.length > 0) {
    return features;
  }

  return [
    '全作品をメンバーシップで視聴可能',
    '無料会員登録後に有料登録へ進行',
    '請求情報の変更や解約は Stripe で管理',
  ];
}

export default function SubscriptionPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApiClient();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const { accessState, isLoading: isMembershipLoading } = useMembershipStatus();
  const useMockSubscriptions = import.meta.env.VITE_USE_MOCK_SUBSCRIPTIONS === 'true';

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return normalizeReturnTo(searchParams.get('returnTo'));
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const loadPlan = async () => {
      setIsLoadingPlan(true);
      setError(null);

      if (useMockSubscriptions) {
        if (!cancelled) {
          setPlan(MOCK_MEMBERSHIP_PLAN);
          setIsLoadingPlan(false);
        }
        return;
      }

      try {
        const result = await api.getSubscriptionPlans();
        if (cancelled) return;

        const nextPlan = resolveMembershipPlan(result.items);
        setPlan(nextPlan);

        if (!nextPlan) {
          setError('利用可能なメンバーシップが見つかりませんでした。');
        }
      } catch (loadError) {
        console.error('Error fetching subscription plans:', loadError);
        if (!cancelled) {
          setError('メンバーシップ情報の取得に失敗しました。');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlan(false);
        }
      }
    };

    void loadPlan();
    return () => {
      cancelled = true;
    };
  }, [api, useMockSubscriptions]);

  const featureList = useMemo(() => toFeatureList(plan), [plan]);

  const handleStartCheckout = async () => {
    if (accessState === 'member') {
      navigate(returnTo, { replace: true });
      return;
    }

    if (!plan) {
      setError('メンバーシップ情報を確認できません。');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      if (useMockSubscriptions) {
        navigate(returnTo, { replace: true });
        return;
      }

      const billingToken = getBillingToken(auth);
      if (!billingToken) {
        setError('メンバーシップ登録を開始するには、もう一度ログインしてください。');
        return;
      }

      const session = await api.createSubscriptionCheckoutSession({
        plan_id: plan.id,
        successUrl: buildAbsoluteAppUrl(
          window.location.origin,
          buildSubscriptionCompletionPath(returnTo),
        ),
        cancelUrl: buildAbsoluteAppUrl(
          window.location.origin,
          buildSubscriptionPath(returnTo),
        ),
      }, billingToken);

      window.location.assign(session.url);
    } catch (checkoutError) {
      console.error('Subscription checkout error:', checkoutError);
      setError('メンバーシップ登録の開始に失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery=""
        onSearchChange={() => {}}
        hideMembershipLink={true}
      />

      <main className="container mx-auto px-4 py-8 pt-24">
        <section className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">メンバーシップ</h2>

          <div className="mx-auto mt-8 grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-gray-800 p-6">
              <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-white">会員登録後に有料化</h3>
              <p className="text-gray-400">
                まず無料会員としてログインし、その後にメンバーシップ登録を行う構成です。
              </p>
            </div>
            <div className="rounded-lg bg-gray-800 p-6">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-white">決済は Stripe</h3>
              <p className="text-gray-400">
                登録、請求情報変更、解約は Stripe Checkout と Billing Portal で管理します。
              </p>
            </div>
            <div className="rounded-lg bg-gray-800 p-6">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-white">月額固定</h3>
              <p className="text-gray-400">
                メンバーシップは月額 {MEMBERSHIP_MONTHLY_PRICE.toLocaleString()} 円の単一プランです。
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mx-auto mb-8 max-w-3xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mx-auto max-w-4xl">
          {isLoadingPlan ? (
            <div className="text-center text-gray-400">メンバーシップ情報を読み込み中です...</div>
          ) : plan ? (
            <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-gray-800 to-gray-900 p-8 shadow-2xl">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200">Membership</p>
                  <h3 className="mt-3 text-3xl font-bold text-white">メンバーシップ</h3>
                  <p className="mt-4 text-base leading-7 text-gray-300">
                    このプランに登録すると、ログイン済みアカウントで全作品を視聴できます。
                  </p>

                  {accessState === 'member' && !isMembershipLoading && (
                    <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                      メンバーシップ登録済みです。元の画面へ戻ってそのまま視聴できます。
                    </div>
                  )}

                  <ul className="mt-6 space-y-3">
                    {featureList.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-gray-200">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="min-w-[260px] rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Monthly</p>
                  <p className="mt-3 text-5xl font-bold text-white">¥{MEMBERSHIP_MONTHLY_PRICE.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-gray-400">税込 / 月</p>
                  <button
                    onClick={() => {
                      void handleStartCheckout();
                    }}
                    disabled={isProcessing || (isAuthenticated && isMembershipLoading)}
                    className="mt-6 w-full rounded-xl bg-white px-6 py-3 font-semibold text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing
                      ? 'Stripe に移動しています...'
                      : isAuthenticated && isMembershipLoading
                        ? '登録状態を確認中...'
                        : accessState === 'member'
                          ? '元の画面へ戻る'
                          : isAuthenticated
                            ? 'メンバーシップに登録'
                            : 'ログインして登録'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">表示できるメンバーシップがありません。</div>
          )}
        </section>
      </main>
    </div>
  );
}
