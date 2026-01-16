import { Target, Calendar, TrendingUp, Award } from "lucide-react";
import { Progress } from "@/shared/ui/progress";

interface UserStats {
  totalDecks: number;
  cardsReviewed: number;
  totalStudySessions: number;
  averageScore: number;
}

interface ProfileStatsProps {
  userStats: UserStats;
  unlockedCount: number;
  totalAchievements: number;
  progressPercentage: number;
}

export function ProfileStats({
  userStats,
  unlockedCount,
  totalAchievements,
  progressPercentage,
}: ProfileStatsProps) {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {userStats?.totalDecks || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Decks
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {userStats?.cardsReviewed || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cards Reviewed
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {userStats?.totalStudySessions || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Study Sessions
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {userStats?.averageScore || 0}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg Score
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl text-gray-900 dark:text-gray-100">
            Achievement Progress
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {unlockedCount} of {totalAchievements} unlocked
          </span>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {Math.round(progressPercentage)}% complete
        </p>
      </div>
    </>
  );
}
