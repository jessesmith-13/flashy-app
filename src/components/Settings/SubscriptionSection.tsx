import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Crown, CreditCard, X, AlertCircle, RefreshCw } from "lucide-react";

interface SubscriptionSectionProps {
  user: any;
  isPremiumSubscription: boolean;
  canCancelSubscription: boolean;
  subscriptionInfo: {
    name: string;
    color: string;
    icon: any;
  };
  onUpgrade: () => void;
  onCancelSubscription: () => void;
  onChangePlan: () => void;
}

export function SubscriptionSection({
  user,
  isPremiumSubscription,
  canCancelSubscription,
  subscriptionInfo,
  onUpgrade,
  onCancelSubscription,
  onChangePlan,
}: SubscriptionSectionProps) {
  // Check if user is moderator or superuser (they have premium features without a subscription)
  const isModerator = user?.isModerator === true;
  const isSuperuser = user?.isSuperuser === true;
  const hasSpecialRole = isModerator || isSuperuser;
  const isRecurring =
    user?.subscriptionTier === "monthly" || user?.subscriptionTier === "annual";

  // Effective premium status includes special roles
  const effectiveIsPremium = isPremiumSubscription || hasSpecialRole;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-6 border ${
        effectiveIsPremium
          ? `border-${subscriptionInfo.color}-200 dark:border-${subscriptionInfo.color}-800`
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-gray-900 dark:text-gray-100">
          Subscription
        </h2>
        {effectiveIsPremium && (
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full bg-${subscriptionInfo.color}-100 dark:bg-${subscriptionInfo.color}-900/30`}
          >
            <Crown
              className={`w-4 h-4 text-${subscriptionInfo.color}-600 dark:text-${subscriptionInfo.color}-400`}
            />
            <span
              className={`text-sm text-${subscriptionInfo.color}-700 dark:text-${subscriptionInfo.color}-400`}
            >
              Premium
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Cancellation Warning */}
        {user?.subscriptionCancelledAtPeriodEnd && user?.subscriptionExpiry && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  Your subscription is set to cancel on{" "}
                  <span className="font-medium">
                    {new Date(user.subscriptionExpiry).toLocaleDateString()}
                  </span>
                  .
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  You'll keep premium access until then. You won't be charged
                  again unless you reactivate.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Role Badge for Moderators/Superusers */}
        {hasSpecialRole && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-purple-900 dark:text-purple-200 font-medium">
                  {isSuperuser ? "Superuser Access" : "Moderator Access"}
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  You have lifetime premium access and{" "}
                  {isSuperuser ? "full administrative" : "moderation"}{" "}
                  privileges.
                </p>
              </div>
            </div>
          </div>
        )}

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
              {user?.subscriptionTier === "free"
                ? "Free"
                : subscriptionInfo.name}
            </p>
            {user?.subscriptionExpiry && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.subscriptionCancelledAtPeriodEnd ? "Ends" : "Renews"}{" "}
                {new Date(user.subscriptionExpiry).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t dark:border-gray-700 space-y-2">
          {!effectiveIsPremium && (
            <Button
              onClick={onUpgrade}
              className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          )}

          {/* Show special role message for moderators/superusers */}
          {hasSpecialRole && !isPremiumSubscription && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                You have access to all premium features through your{" "}
                {isSuperuser ? "superuser" : "moderator"} role!
              </p>
            </div>
          )}

          {canCancelSubscription && !user?.subscriptionCancelledAtPeriodEnd && (
            <Button
              variant="outline"
              onClick={onCancelSubscription}
              className="w-full justify-start border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Subscription
            </Button>
          )}

          {user?.subscriptionTier === "lifetime" && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                You have lifetime access to all premium features!
              </p>
            </div>
          )}

          {isRecurring && (
            <Button
              onClick={onChangePlan}
              className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Change Plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
