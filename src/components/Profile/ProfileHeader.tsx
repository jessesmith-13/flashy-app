import { Edit2, Flame, Trophy, Users, Camera, UserPlus } from "lucide-react";
import { ProvenanceBadges } from "../Provenance/ProvenanceBadges";

interface ProfileHeaderProps {
  user: {
    avatarUrl?: string;
    displayName?: string;
    name?: string;
    userRole?:
      | "educator"
      | "student"
      | "self_learner"
      | "researcher"
      | "org"
      | "other";
    userRoleVerified?: boolean;
  };
  studyStreak: number;
  unlockedAchievements: number;
  totalAchievements: number;
  friendsCount: number;
  uploading: boolean;
  onAvatarClick: () => void;
  onEditClick: () => void;
  onInviteClick: () => void;
}

export function ProfileHeader({
  user,
  studyStreak,
  unlockedAchievements,
  totalAchievements,
  friendsCount,
  uploading,
  onAvatarClick,
  onEditClick,
  onInviteClick,
}: ProfileHeaderProps) {
  // Only show role badge if role exists and is not "other"
  const shouldShowRoleBadge = user?.userRole && user.userRole !== "other";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative cursor-pointer group" onClick={onAvatarClick}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-4xl">
              {(user?.displayName || user?.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          {/* Camera overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : (
              <Camera className="w-8 h-8 text-white" />
            )}
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">
              {user?.displayName || user?.name}
            </h1>
            <button
              onClick={onEditClick}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Role Badge - Only show if role exists and is not "other" */}
          {shouldShowRoleBadge && (
            <div className="flex justify-center md:justify-start mb-3">
              <ProvenanceBadges
                creatorRole={user.userRole}
                creatorRoleVerified={user.userRoleVerified}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <span className="text-gray-900 dark:text-gray-100">
                {studyStreak} day streak
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Trophy className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-gray-900 dark:text-gray-100">
                {unlockedAchievements}/{totalAchievements} achievements
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <span className="text-gray-900 dark:text-gray-100">
                {friendsCount} friends
              </span>
            </div>
            <button
              onClick={onInviteClick}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
            >
              <UserPlus className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-gray-900 dark:text-gray-100">
                Invite friends
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
