import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'
import { Crown } from 'lucide-react'

type PlanType = 'monthly' | 'annual' | 'lifetime'

interface ChangePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: PlanType
  newPlan: PlanType
  changing: boolean
  onConfirm: () => void
}

const planNames: Record<PlanType, string> = {
  monthly: 'Monthly Premium',
  annual: 'Annual Premium',
  lifetime: 'Lifetime Premium'
}

const planPrices: Record<PlanType, string> = {
  monthly: '$6.99/month',
  annual: '$29.99/year',
  lifetime: '$89.99 one-time'
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  currentPlan,
  newPlan,
  changing,
  onConfirm
}: ChangePlanDialogProps) {
  const isUpgrade = 
    (currentPlan === 'monthly' && (newPlan === 'annual' || newPlan === 'lifetime')) ||
    (currentPlan === 'annual' && newPlan === 'lifetime')
  
  const isDowngrade = 
    (currentPlan === 'annual' && newPlan === 'monthly') ||
    (currentPlan === 'lifetime' && (newPlan === 'monthly' || newPlan === 'annual'))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            {isUpgrade ? 'Upgrade Plan?' : isDowngrade ? 'Downgrade Plan?' : 'Change Plan?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div>
              You are changing from <span className="font-semibold text-gray-900 dark:text-gray-100">{planNames[currentPlan]}</span> to <span className="font-semibold text-gray-900 dark:text-gray-100">{planNames[newPlan]}</span>.
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <p className="text-sm text-purple-900 dark:text-purple-100">
                <span className="font-semibold">New Plan:</span> {planNames[newPlan]}
              </p>
              <p className="text-sm text-purple-900 dark:text-purple-100 mt-1">
                <span className="font-semibold">Price:</span> {planPrices[newPlan]}
              </p>
            </div>

            {isUpgrade && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You will be charged the prorated difference immediately, and your billing will be updated to the new plan.
              </p>
            )}

            {isDowngrade && newPlan !== 'lifetime' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your plan will be changed at the end of your current billing period. You'll keep your current benefits until then.
              </p>
            )}

            {newPlan === 'lifetime' && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Upgrading to Lifetime will give you permanent access to all premium features with no recurring charges!
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={changing}>Keep Current Plan</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={changing}
          >
            {changing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              `Change to ${planNames[newPlan]}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}