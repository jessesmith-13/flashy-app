import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Check, Sparkles, Crown, Infinity as InfinityIcon, Image, Brain, Users, Upload } from 'lucide-react'
import { SUBSCRIPTION_PRICES } from '../../utils/subscription'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: string // Optional: specific feature that triggered the modal
}

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: SUBSCRIPTION_PRICES.monthly.price,
      interval: 'month',
      icon: Sparkles,
      color: 'from-blue-400 to-blue-600',
      popular: false,
    },
    {
      id: 'annual',
      name: 'Annual',
      price: SUBSCRIPTION_PRICES.annual.price,
      interval: 'year',
      icon: Crown,
      color: 'from-emerald-400 to-emerald-600',
      popular: true,
      savings: 'Save 64%',
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: SUBSCRIPTION_PRICES.lifetime.price,
      interval: 'once',
      icon: InfinityIcon,
      color: 'from-purple-400 to-purple-600',
      popular: false,
      savings: 'Best Value',
    },
  ]

  const features = [
    { icon: Brain, text: 'AI flashcard generation from PDFs, images & chat' },
    { icon: InfinityIcon, text: 'Unlimited decks and cards' },
    { icon: Image, text: 'Add images to flashcards' },
    { icon: Users, text: 'Import decks from Community' },
    { icon: Upload, text: 'Publish decks to Community' },
  ]

  const handleUpgrade = (planId: string) => {
    // For now, just show a message - you'll implement payment processing later
    alert(`Payment integration coming soon! Selected plan: ${planId}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription className="text-center">
            {feature ? `Unlock ${feature} and more premium features` : 'Choose a plan that fits your learning goals'}
          </DialogDescription>
        </DialogHeader>

        {/* Premium Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 py-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{feature.text}</p>
              </div>
            )
          })}
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`relative border-2 rounded-2xl p-6 ${
                  plan.popular ? 'border-emerald-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'
                } bg-white dark:bg-gray-800`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs">
                    Most Popular
                  </div>
                )}
                
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl text-gray-900 dark:text-gray-100 mb-1">{plan.name}</h3>
                
                <div className="mb-4">
                  <span className="text-3xl text-gray-900 dark:text-gray-100">${plan.price}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {plan.interval === 'once' ? '' : `/${plan.interval}`}
                  </span>
                  {plan.savings && (
                    <div className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">{plan.savings}</div>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    AI Generation
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    Unlimited Decks
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    Image Support
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    Community Decks
                  </li>
                </ul>

                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white'
                  }`}
                >
                  Choose {plan.name}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Free Plan Limits */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Free plan includes: <strong className="text-gray-900 dark:text-gray-100">15 decks</strong> and <strong className="text-gray-900 dark:text-gray-100">50 cards per deck</strong>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
