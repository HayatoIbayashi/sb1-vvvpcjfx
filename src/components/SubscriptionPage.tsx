import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CreditCard, Calendar } from 'lucide-react';
import { SubscriptionPlans } from '../SubscriptionPlans';
import { Header } from './common/Header';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedTokens = localStorage.getItem('cognito_tokens');
    setIsAuthenticated(!!storedTokens);
  }, []);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    try {
      setIsProcessing(true);
      // TODO: Implement actual subscription logic with Stripe
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      navigate('/');
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={() => {
          localStorage.removeItem('cognito_tokens');
          window.location.reload();
        }}
        searchQuery=""
        onSearchChange={() => {}}
        hideMembershipLink={true}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Benefits Section */}
        <section className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">
            メンバーシップ特典
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-6 bg-gray-800 rounded-lg">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                全作品見放題
              </h3>
              <p className="text-gray-400">
                最新作から名作まで、すべての作品を追加料金なしで視聴できます。
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg">
              <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                いつでも解約可能
              </h3>
              <p className="text-gray-400">
                契約期間の縛りなし。必要なときだけ利用できます。
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                毎月更新される作品
              </h3>
              <p className="text-gray-400">
                新作が続々追加。飽きることなく楽しめます。
              </p>
            </div>
          </div>
        </section>

        {/* Plans Section */}
        {step === 'plans' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              プランを選択
            </h2>
            <SubscriptionPlans onSelectPlan={handlePlanSelect} />
            {selectedPlan && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setStep('payment')}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
                >
                  次へ進む
                </button>
              </div>
            )}
          </section>
        )}

        {/* Payment Section */}
        {step === 'payment' && (
          <section className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">
              支払い情報の入力
            </h2>
            <div className="bg-dark-lighter rounded-lg p-6">
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2">
                    カード番号
                  </label>
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-4 py-2 bg-dark rounded border border-dark-light text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">
                      有効期限
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full px-4 py-2 bg-dark rounded border border-dark-light text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">
                      セキュリティコード
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-4 py-2 bg-dark rounded border border-dark-light text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">
                    カード名義
                  </label>
                  <input
                    type="text"
                    placeholder="TARO YAMADA"
                    className="w-full px-4 py-2 bg-dark rounded border border-dark-light text-white"
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? '処理中...' : '登録する'}
                  </button>
                </div>
              </form>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setStep('plans')}
                className="text-gray-400 hover:text-white transition"
              >
                プラン選択に戻る
              </button>
            </div>
          </section>
        )}

        {/* Terms Section */}
        <section className="max-w-2xl mx-auto mt-12 text-center text-sm text-gray-400">
          <p className="mb-4">
            ※ サブスクリプションは、選択したプラン期間で自動更新されます。
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
