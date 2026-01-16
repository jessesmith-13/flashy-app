import { Lock, Crown } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface PremiumWarningBannerProps {
  onUpgradeClick: () => void;
}

export function PremiumWarningBanner({
  onUpgradeClick,
}: PremiumWarningBannerProps) {
  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500 dark:bg-amber-600 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Premium Feature
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
            AI card generation is available exclusively for Premium and Pro
            subscribers. Upgrade to unlock AI-powered flashcard creation with
            customizable difficulty levels and card types.
          </p>
          <Button
            size="sm"
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white h-8"
          >
            <Crown className="w-4 h-4 mr-1.5" />
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  );
}
