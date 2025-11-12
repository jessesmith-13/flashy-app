import { CheckCircle2, Lock, } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { getAchievementsByCategory, CATEGORY_LABELS, AchievementCategory } from '../../../utils/achievements'

interface ProfileAchievementsProps {
  unlockedAchievementIds: string[]
}

export function ProfileAchievements({ unlockedAchievementIds }: ProfileAchievementsProps) {
  const achievementsByCategory = getAchievementsByCategory(unlockedAchievementIds)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">Achievements</h2>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full grid grid-cols-3 lg:grid-cols-5 mb-6 h-auto gap-2">
          <TabsTrigger value="all" className="text-xs lg:text-sm">
            All
          </TabsTrigger>
          <TabsTrigger value="streaks" className="text-xs lg:text-sm">
            Streaks
          </TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs lg:text-sm">
            Milestones
          </TabsTrigger>
          <TabsTrigger value="creation" className="text-xs lg:text-sm">
            Creation
          </TabsTrigger>
          <TabsTrigger value="mastery" className="text-xs lg:text-sm">
            Mastery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-8">
          {Object.entries(achievementsByCategory).map(([category, { unlocked, locked }]) => {
            const total = unlocked.length + locked.length
            if (total === 0) return null
            
            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900 dark:text-gray-100">
                    {CATEGORY_LABELS[category as AchievementCategory]}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {unlocked.length}/{total}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Show unlocked first */}
                  {unlocked.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                            {achievement.title}
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show locked achievements */}
                  {locked.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl grayscale">{achievement.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                            {achievement.title}
                            <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>

        {/* Individual category tabs */}
        {Object.entries(achievementsByCategory).map(([category, { unlocked, locked }]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-gray-100">
                {CATEGORY_LABELS[category as AchievementCategory]}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {unlocked.length}/{unlocked.length + locked.length}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                        {achievement.title}
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {locked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl grayscale">{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                        {achievement.title}
                        <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
