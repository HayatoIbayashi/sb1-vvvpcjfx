import { Check } from 'lucide-react';

export type SubscriptionPlanOption = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
};

type SubscriptionPlansProps = {
  plans: SubscriptionPlanOption[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
};

function buildFeatureList(plan: SubscriptionPlanOption) {
  const fromDescription = (plan.description || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (fromDescription.length > 0) {
    return fromDescription;
  }

  return [
    `${plan.name} のメンバーシップ特典を利用できます`,
    'いつでも解約できます',
  ];
}

export function SubscriptionPlans({
  plans,
  selectedPlanId,
  onSelectPlan,
}: SubscriptionPlansProps) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {plans.map((plan) => {
        const features = buildFeatureList(plan);
        const isSelected = selectedPlanId === plan.id;

        return (
          <div
            key={plan.id}
            className={`relative flex h-full flex-col rounded-xl bg-gray-800 p-6 transition-all ${
              isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-900' : ''
            }`}
          >
            <div className="mb-6 text-center">
              <h3 className="mb-2 text-xl font-bold text-white">{plan.name}</h3>
              <div className="mb-2 text-3xl font-bold text-white">
                ¥{plan.price_monthly.toLocaleString()}
                <span className="ml-1 text-base font-normal text-gray-400">/月</span>
              </div>
            </div>

            <ul className="flex-grow space-y-4">
              {features.map((feature) => (
                <li key={`${plan.id}-${feature}`} className="flex items-start">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                  <span className="ml-3 text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onSelectPlan(plan.id)}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg border px-6 py-3 font-semibold transition-all ${
                isSelected
                  ? 'border-primary-dark bg-primary text-white'
                  : 'border-gray-600 bg-dark-light text-white hover:border-primary/70 hover:bg-primary/90'
              } shadow-md hover:shadow-lg active:scale-[0.98]`}
            >
              {isSelected ? (
                <>
                  <Check className="h-5 w-5" />
                  選択中
                </>
              ) : (
                'このプランを選択'
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
