import { User } from '../../../store/useStore'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { Crown, CreditCard, X, LucideIcon } from 'lucide-react'

interface SubscriptionSectionProps {
  user?: User | null
  isPremiumSubscription?: boolean | null
  canCancelSubscription?: boolean | null
  subscriptionInfo: {
    name: string
    color: string
    icon: LucideIcon
  }
  onUpgrade: () => void
  onCancelSubscription: () => void
}

export function SubscriptionSection({
  user,
  isPremiumSubscription,
  canCancelSubscription,
  subscriptionInfo,
  onUpgrade,
  onCancelSubscription
}: SubscriptionSectionProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 border ${
      isPremiumSubscription 
        ? `border-${subscriptionInfo.color}-200 dark:border-${subscriptionInfo.color}-800` 
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-gray-900 dark:text-gray-100">Subscription</h2>
        {isPremiumSubscription && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-${subscriptionInfo.color}-100 dark:bg-${subscriptionInfo.color}-900/30`}>
            <Crown className={`w-4 h-4 text-${subscriptionInfo.color}-600 dark:text-${subscriptionInfo.color}-400`} />
            <span className={`text-sm text-${subscriptionInfo.color}-700 dark:text-${subscriptionInfo.color}-400`}>
              Premium
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <Label className="text-sm">Current Plan</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {subscriptionInfo.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {user?.subscriptionTier === 'free' ? 'Free' : subscriptionInfo.name}
            </p>
            {user?.subscriptionExpiry && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Renews {new Date(user.subscriptionExpiry).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t dark:border-gray-700 space-y-2">
          {!isPremiumSubscription && (
            <Button
              onClick={onUpgrade}
              className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          )}
          
          {canCancelSubscription && (
            <Button
              variant="outline"
              onClick={onCancelSubscription}
              className="w-full justify-start border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Subscription
            </Button>
          )}
          
          {user?.subscriptionTier === 'lifetime' && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                You have lifetime access to all premium features!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
