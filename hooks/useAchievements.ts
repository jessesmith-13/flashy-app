import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/**
 * Syncs achievements from backend to local store on mount
 * Achievements are tracked server-side during study sessions
 */
export function useAchievements() {
  const { fetchUserAchievements, accessToken, userAchievements } = useStore()

  useEffect(() => {
    // Fetch achievements from backend when component mounts
    if (accessToken && !userAchievements) {
      console.log('📊 Fetching achievements from backend...')
      fetchUserAchievements()
    }
  }, [accessToken, userAchievements, fetchUserAchievements])

  return userAchievements
}