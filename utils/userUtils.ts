import { useStore } from '../store/useStore'

/**
 * Utility hook to check if current user is a superuser
 */
export const useIsSuperuser = (): boolean => {
  const user = useStore((state) => state.user)
  return user?.isSuperuser === true
}

/**
 * Utility function to check if a user object is a superuser
 */
export const checkIsSuperuser = (user: any): boolean => {
  return user?.isSuperuser === true
}
