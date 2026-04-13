import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CreditCard, Calendar } from 'lucide-react';
import { SubscriptionPlans, type SubscriptionPlanOption } from '../SubscriptionPlans';
import { Header } from './common/Header';
import { useAuthStatus } from '../lib/authBridge';
import useApiClient from '../lib/useApiClient';
import type { SubscriptionPlan } from '../lib/apiClient';

const MOCK_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'mock-monthly',
    name: '月額プラン',
    description: '全ての動画が見放題\nいつでも解約できます',
    price_monthly: 500,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mock-premium',
    name: 'プレミアムプラン',
    description: '全ての動画が見放題\n先行公開作品も視聴できます',
    price_monthly: 980,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

function toPlanOptions(plans: SubscriptionPlan[]): SubscriptionPlanOption[] {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price_monthly: plan.price_monthly,
  }));
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const api = useApiClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [isProcessing, setIsProcessing] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const useMockSubscriptions = import.meta.env.VITE_USE_MOCK_SUBSCRIPTIONS === 'true';

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      setIsLoadingPlans(true);
      setError(null);

      if (useMockSubscriptions) {
        if (!cancelled) {
          setPlans(MOCK_SUBSCRIPTION_PLANS);
          setIsLoadingPlans(false);
        }
        return;
      }

      try {
        const res = await api.getSubscriptionPlans();
        if (cancelled) return;

        setPlans(res.items);
        if (res.items.length === 0) {
          setError('利用可能なプランが登録されていません。');
        }
      } catch (loadError) {
        console.error('Error fetching subscription plans:', loadError);
        if (!cancelled) {
          setError('プラン情報の取得に失敗しました。');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlans(false);
        }
      }
    };

    void loadPlans();
    return () => {
      cancelled = true;
    };
  }, [api, useMockSubscriptions]);

  const planOptions = useMemo(() => toPlanOptions(plans), [plans]);
  const selectedPlanDetail = useMemo(
    () => planOptions.find((plan) => plan.id === selectedPlan) ?? null,
    [planOptions, selectedPlan],
  );

  // プラン選択状態を保持
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setError(null);
  };

  // 支払いステップへ進む前に選択状態を確認
  const handleProceedToPayment = () => {
    if (!selectedPlan) {
      setError('プランを選択してください。');
      return;
    }
    setStep('payment');
  };

  // サブスク登録を DB に保存
  const handleSubscribe = async () => {
    if (!selectedPlan) {
      setError('プランを選択してください。');
      setStep('plans');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      if (!useMockSubscriptions) {
        await api.subscribeCurrent({ plan_id: selectedPlan });
      }

      navigate('/account');
    } catch (subscribeError) {
      console.error('Subscription error:', subscribeError);
      setError('メンバーシップ登録に失敗しました。');
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

      <main className="container mx-auto px-4 py-8">
        <section className="mb-12 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">メンバーシップ特典</h2>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-gray-800 p-6">
              <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-white">全作品見放題</h3>
              <p className="text-gray-400">
                最新作から名作まで、すべての作品を追加料金なしで視聴できます。
              </p>
            </div>
            <div className="rounded-lg bg-gray-800 p-6">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-white">いつでも解約可能</h3>
              <p className="text-gray-400">
                契約期間の縛りなし。必要なときだけ利用できます。
              </p>
            </div>
            <div className="rounded-lg bg-gray-800 p-6">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-white">毎月更新される作品</h3>
              <p className="text-gray-400">
                新作が続々追加。飽きることなく楽しめます。
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mx-auto mb-8 max-w-3xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {step === 'plans' && (
          <section className="mb-12">
            <h2 className="mb-8 text-center text-2xl font-bold text-white">プランを選択</h2>

            {isLoadingPlans ? (
              <div className="text-center text-gray-400">プラン情報を読み込み中です...</div>
            ) : planOptions.length > 0 ? (
              <>
                <SubscriptionPlans
                  plans={planOptions}
                  selectedPlanId={selectedPlan}
                  onSelectPlan={handlePlanSelect}
                />
                <div className="mt-8 text-center">
                  <button
                    onClick={handleProceedToPayment}
                    className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary/90"
                  >
                    次へ進む
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">表示できるプランがありません。</div>
            )}
          </section>
        )}

        {step === 'payment' && selectedPlanDetail && (
          <section className="mx-auto max-w-xl">
            <h2 className="mb-8 text-2xl font-bold text-white">支払い情報の入力</h2>
            <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
              <p className="text-sm text-gray-400">選択中のプラン</p>
              <p className="mt-1 text-lg font-semibold text-white">{selectedPlanDetail.name}</p>
              <p className="mt-1 text-sm text-gray-300">¥{selectedPlanDetail.price_monthly.toLocaleString()}/月</p>
            </div>
            <div className="rounded-lg bg-dark-lighter p-6">
              <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
                <div>
                  <label className="mb-2 block text-gray-300">カード番号</label>
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="w-full rounded border border-dark-light bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-gray-300">有効期限</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full rounded border border-dark-light bg-dark px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-gray-300">セキュリティコード</label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full rounded border border-dark-light bg-dark px-4 py-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">カード名義</label>
                  <input
                    type="text"
                    placeholder="TARO YAMADA"
                    className="w-full rounded border border-dark-light bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                    className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? '処理中...' : '登録する'}
                  </button>
                </div>
              </form>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setStep('plans')}
                className="text-gray-400 transition hover:text-white"
              >
                プラン選択に戻る
              </button>
            </div>
          </section>
        )}

        <section className="mx-auto mt-12 max-w-2xl text-center text-sm text-gray-400">
          <p className="mb-4">
            ※ サブスクリプションは、選択したプランで自動更新されます。
            解約は次回更新日の前日までいつでも可能です。
          </p>
          <p>
            登録することで、
            <a href="/terms" className="text-primary hover:underline">利用規約</a>
            と
            <a href="/privacy" className="text-primary hover:underline">プライバシーポリシー</a>
            に同意したものとみなされます。
          </p>
        </section>
      </main>
    </div>
  );
}
