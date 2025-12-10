import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Crown, Check } from 'lucide-react'

interface PlanSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: string
  onSelectPlan: (plan: 'monthly' | 'annual' | 'lifetime') => void
}

export function PlanSelectionDialog({
  open,
  onOpenChange,
  currentPlan,
  onSelectPlan
}: PlanSelectionDialogProps) {
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Premium',
      price: '$6.99',
      period: '/month',
      features: [
        'Unlimited decks and cards',
        'AI-powered flashcard generation',
        'Advanced study modes',
        'Detailed progress analytics',
        'Priority support'
      ],
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      checkColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'annual',
      name: 'Annual Premium',
      price: '$29.99',
      period: '/year',
      savings: 'Save $54',
      features: [
        'All Monthly Premium features',
        '7 months free (64% savings)',
        'Priority customer support',
        'Early access to new features'
      ],
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      checkColor: 'text-emerald-600 dark:text-emerald-400',
      popular: true
    },
    {
      id: 'lifetime',
      name: 'Lifetime Premium',
      price: '$89.99',
      period: 'one-time',
      savings: 'Best Value',
      features: [
        'All Premium features forever',
        'Never pay again',
        'Lifetime updates',
        'VIP support',
        'Exclusive lifetime member badge'
      ],
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      badgeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      checkColor: 'text-purple-600 dark:text-purple-400'
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1400px] max-h-[90vh] overflow-y-auto w-[96vw] sm:!max-w-[1400px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Select Your Plan
          </DialogTitle>
          <DialogDescription>
            Choose the plan that works best for you. You can change or cancel anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4 pb-2">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-7 pt-12 transition-all flex flex-col ${
                  isCurrent
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${plan.popular ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-600 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-purple-600 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <Check className="w-3 h-3" />
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 flex-wrap mb-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {plan.period}
                    </span>
                  </div>
                  {plan.savings && (
                    <div className={`inline-block ${plan.badgeColor} text-xs font-medium px-2.5 py-1 rounded-full`}>
                      {plan.savings}
                    </div>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 ${plan.checkColor} flex-shrink-0 mt-0.5`} />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => onSelectPlan(plan.id as 'monthly' | 'annual' | 'lifetime')}
                  disabled={isCurrent}
                  className={`w-full ${
                    isCurrent
                      ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                      : `${plan.buttonColor} text-white`
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}