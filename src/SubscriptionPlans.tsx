import { useState } from 'react';
import { Check, X } from 'lucide-react';

const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: '月額プラン',
    price: 500,
    interval: '月',
    features: [
      '全ての動画が見放題',
      'HD画質での視聴',
    ]
  },
  {
    id: 'yearly',
    name: '年額プラン',
    price: 5000,
    interval: '年',
    features: [
      '全ての動画が見放題',
      'HD画質での視聴',
      '2ヶ月分お得'
    ],
    recommended: true
  }
];

interface SubscriptionPlansProps {
  onSelectPlan: (planId: string) => void;
}

export function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    onSelectPlan(planId);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {SUBSCRIPTION_PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex flex-col h-full bg-gray-800 rounded-xl p-6 transition-all ${
            selectedPlan === plan.id ? 'ring-2 ring-primary ring-offset-2' : ''
          }`}
        >
          
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold text-white mb-1">
              ¥{plan.price.toLocaleString()}
              <span className="text-gray-400 text-base font-normal">/{plan.interval}</span>
            </div>
            {plan.id === 'yearly' && (
              <p className="text-primary text-white">2ヶ月分お得！</p>
            )}
          </div>

          <ul className="space-y-4 flex-grow">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <Check className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => handlePlanSelect(plan.id)}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 border ${
              selectedPlan === plan.id
                ? 'bg-primary text-white border-primary-dark'
                : 'bg-dark-light text-white border-gray-600 hover:bg-primary/90 hover:border-primary/70'
            } shadow-md hover:shadow-lg active:scale-[0.98]`}
          >
            {selectedPlan === plan.id ? (
              <>
                <Check className="h-5 w-5" />
                選択中
              </>
            ) : (
              'このプランを選択'
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
