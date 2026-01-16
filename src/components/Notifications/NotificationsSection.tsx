import { Switch } from "@/ui/switch";
import { Label } from "@/ui/label";
import { Mail, Tag, MessageSquare, UserPlus } from "lucide-react";

interface NotificationsSectionProps {
  userEmail: string | undefined;
  emailNotifications: boolean;
  emailOffers: boolean;
  emailCommentReplies: boolean;
  emailFriendRequests: boolean;
  onEmailNotificationsChange: (checked: boolean) => void;
  onEmailOffersChange: (checked: boolean) => void;
  onEmailCommentRepliesChange: (checked: boolean) => void;
  onEmailFriendRequestsChange: (checked: boolean) => void;
}

export function NotificationsSection({
  userEmail,
  emailNotifications,
  emailOffers,
  emailCommentReplies,
  emailFriendRequests,
  onEmailNotificationsChange,
  onEmailOffersChange,
  onEmailCommentRepliesChange,
  onEmailFriendRequestsChange,
}: NotificationsSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg text-gray-900 dark:text-gray-100 mb-4">
        Email Notifications
      </h2>
      <div className="space-y-4">
        {/* Main Email Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <Label htmlFor="emailNotifications" className="text-sm">
                Enable Email Notifications
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive notifications at {userEmail}
              </p>
            </div>
          </div>
          <Switch
            id="emailNotifications"
            checked={emailNotifications}
            onCheckedChange={onEmailNotificationsChange}
          />
        </div>

        {/* Sub-options - shown when email notifications are enabled */}
        {emailNotifications && (
          <div className="ml-8 space-y-4 pt-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <div>
                  <Label htmlFor="emailOffers" className="text-sm">
                    Exclusive Offers
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Special deals and promotions
                  </p>
                </div>
              </div>
              <Switch
                id="emailOffers"
                checked={emailOffers}
                onCheckedChange={onEmailOffersChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <div>
                  <Label htmlFor="emailCommentReplies" className="text-sm">
                    Comment Replies
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get notified of replies to your comments
                  </p>
                </div>
              </div>
              <Switch
                id="emailCommentReplies"
                checked={emailCommentReplies}
                onCheckedChange={onEmailCommentRepliesChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <div>
                  <Label htmlFor="emailFriendRequests" className="text-sm">
                    Friend Requests
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get notified of new friend requests
                  </p>
                </div>
              </div>
              <Switch
                id="emailFriendRequests"
                checked={emailFriendRequests}
                onCheckedChange={onEmailFriendRequestsChange}
              />
            </div>
          </div>
        )}

        {/* Disabled state message */}
        {!emailNotifications && (
          <div className="ml-8 pl-4 py-3 border-l-2 border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Enable email notifications to configure preferences
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
