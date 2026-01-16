import { useState, useEffect } from "react";
import { useStore } from "@/shared/state/useStore";
import { Star, Lock } from "lucide-react";
import { getDeckRatings, rateDeck } from "../../../utils/api/community";
import { toast } from "sonner";
import { UpgradeModal } from "../UpgradeModal";

interface DeckRatingProps {
  deckId: string;
  onRatingChange?: () => void;
}

export function DeckRating({ deckId, onRatingChange }: DeckRatingProps) {
  const { user, accessToken } = useStore();
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Check if user has premium features (includes moderators and superusers)
  const isPremium =
    user?.isSuperuser ||
    user?.isModerator ||
    (user?.subscriptionTier && user.subscriptionTier !== "free");

  useEffect(() => {
    loadRatings();
  }, [deckId, accessToken]);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const data = await getDeckRatings(deckId, accessToken || undefined);
      setAverageRating(data.averageRating);
      setTotalRatings(data.totalRatings);
      setUserRating(data.userRating);
    } catch (error) {
      console.error("Failed to load ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) {
      toast.error("Please log in to rate this deck");
      return;
    }

    if (!isPremium) {
      setUpgradeModalOpen(true);
      return;
    }

    if (!accessToken) return;

    setSubmitting(true);
    try {
      const data = await rateDeck(accessToken, deckId, rating);
      setAverageRating(data.averageRating);
      setTotalRatings(data.totalRatings);
      setUserRating(data.userRating);
      toast.success("Rating submitted!");

      // Notify parent component that rating has changed
      if (onRatingChange) {
        onRatingChange();
      }
    } catch (error: any) {
      console.error("Failed to rate deck:", error);
      if (error.message.includes("Premium feature")) {
        setUpgradeModalOpen(true);
      } else {
        toast.error("Failed to submit rating");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Loading ratings...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md">
        <h2 className="text-lg sm:text-xl mb-4 text-gray-900 dark:text-gray-100">
          Rate This Deck
        </h2>

        {/* Average Rating Display */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {averageRating > 0 ? averageRating.toFixed(1) : "—"}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageRating)
                      ? "fill-amber-500 text-amber-500"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalRatings} {totalRatings === 1 ? "rating" : "ratings"}
            </div>
          </div>

          {/* Separator */}
          <div className="h-20 w-px bg-gray-200 dark:bg-gray-700" />

          {/* User Rating Section */}
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {userRating ? "Your rating:" : "Rate this deck:"}
            </p>

            {!isPremium ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 opacity-50">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-6 h-6 text-gray-300 dark:text-gray-600"
                    />
                  ))}
                </div>
                <button
                  onClick={() => setUpgradeModalOpen(true)}
                  className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                >
                  <Lock className="w-4 h-4" />
                  Upgrade to Rate
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = userRating
                    ? star <= userRating
                    : star <= (hoveredStar || 0);
                  return (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(null)}
                      disabled={submitting}
                      className="transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          isActive
                            ? "fill-amber-500 text-amber-500"
                            : "text-gray-300 dark:text-gray-600 hover:text-amber-400 dark:hover:text-amber-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {userRating && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Click a star to change your rating
              </p>
            )}
          </div>
        </div>

        {/* Premium Feature Notice */}
        {!isPremium && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Premium Feature
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Upgrade to rate community decks and help others discover great
                content!
              </p>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={() => setUpgradeModalOpen(false)}
        feature="rating decks"
      />
    </>
  );
}
