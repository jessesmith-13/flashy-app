import { useStore } from "@/shared/state/useStore";

/**
 * Utility hook to check if current user is a superuser (full admin)
 */
export const useIsSuperuser = (): boolean => {
  const user = useStore((state) => state.user);
  return user?.isSuperuser === true;
};

/**
 * Utility hook to check if current user is a moderator (can manage flags and has premium features)
 * Superusers are also considered moderators
 */
export const useIsModerator = (): boolean => {
  const user = useStore((state) => state.user);
  return user?.isSuperuser === true || user?.isModerator === true;
};

/**
 * Utility function to check if a user object is a superuser
 */
export const checkIsSuperuser = (user: any): boolean => {
  return user?.isSuperuser === true;
};

/**
 * Utility function to check if a user object is a moderator
 * Superusers are also considered moderators
 */
export const checkIsModerator = (user: any): boolean => {
  return user?.isSuperuser === true || user?.isModerator === true;
};
