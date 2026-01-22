import { useState, useEffect } from "react";
import { Reply, Flag, Trash2, Heart } from "lucide-react";
import { useStore } from "@/shared/state/useStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { likeComment } from "../../shared/api/community";
import { deleteDeckComment } from "../../shared/api/moderation";

export interface Comment {
  id: string;
  communityDeckId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userRole?: "flashy" | "moderator" | "user"; // Add user role
  text: string;
  parentId: string | null;
  createdAt: string;
  replies: Comment[];
  rootCommentId?: string; // Track the root comment for nested replies
  likes?: string[]; // Array of user IDs who liked this comment
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: string, userName: string, rootCommentId: string) => void;
  level?: number;
  deckAuthorId?: string;
  targetCommentId?: string | null;
  rootCommentId?: string;
  onViewUser?: (userId: string) => void;
  onFlagComment?: (commentId: string, commentText: string) => void;
  onCommentDeleted?: () => void; // Callback to refresh comments after deletion
}

export function CommentItem({
  comment,
  onReply,
  level = 0,
  deckAuthorId,
  targetCommentId,
  rootCommentId,
  onViewUser,
  onFlagComment,
  onCommentDeleted,
}: CommentItemProps) {
  const { user, accessToken } = useStore();
  const isAuthor = deckAuthorId && comment.userId === deckAuthorId;
  const isTarget = targetCommentId === comment.id;
  const isOwnComment = user?.id === comment.userId;
  const [showReplies, setShowReplies] = useState(false);
  const [visibleReplies, setVisibleReplies] = useState(5);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [liking, setLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState<string[]>(comment.likes || []);

  // Check if user can delete (moderator or superuser)
  const canDelete = user?.isModerator === true || user?.isSuperuser === true;

  // Check if current user has liked this comment
  const hasLiked = user?.id ? localLikes.includes(user.id) : false;
  const likeCount = localLikes.length;

  const replyCount = comment.replies?.length || 0;
  const hasMoreReplies = replyCount > visibleReplies;

  const handleDeleteComment = async () => {
    if (!accessToken || !canDelete) return;

    if (!deleteReason) {
      toast.error("Please select a reason for deletion");
      return;
    }

    // Combine reason and optional message
    const fullReason = deleteMessage.trim()
      ? `${deleteReason}: ${deleteMessage.trim()}`
      : deleteReason;

    setDeleteLoading(true);
    try {
      await deleteDeckComment(
        accessToken,
        comment.communityDeckId,
        comment.id,
        fullReason,
      );
      toast.success("Comment deleted successfully");
      setShowDeleteDialog(false);
      setDeleteReason("");
      setDeleteMessage("");

      // Trigger refresh of comments
      if (onCommentDeleted) {
        onCommentDeleted();
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLikeComment = async () => {
    if (!accessToken || !user) {
      toast.error("Please log in to like comments");
      return;
    }

    if (liking) return;

    setLiking(true);

    // Optimistic UI update
    const newLikes = hasLiked
      ? localLikes.filter((id) => id !== user.id)
      : [...localLikes, user.id];
    setLocalLikes(newLikes);

    try {
      await likeComment(accessToken, comment.communityDeckId, comment.id);
    } catch (error) {
      console.error("Failed to like comment:", error);
      // Revert on error
      setLocalLikes(comment.likes || []);
      toast.error("Failed to like comment");
    } finally {
      setLiking(false);
    }
  };

  // Auto-expand replies if this comment or any of its replies is the target
  useEffect(() => {
    if (level === 0 && targetCommentId) {
      const isReplyTarget = comment.replies?.some(
        (r) => r.id === targetCommentId,
      );
      if (comment.id === targetCommentId || isReplyTarget) {
        setShowReplies(true);
        // Show all replies if one is targeted
        if (isReplyTarget) {
          setVisibleReplies(replyCount);
        }
      }
    }
  }, [targetCommentId, comment.id, comment.replies, level, replyCount]);

  return (
    <div
      id={comment.id}
      className={`${level > 0 ? "ml-8 mt-4" : "mt-4"} ${
        level === 0 ? "pb-4 border-b border-gray-200 dark:border-gray-700" : ""
      } ${
        isTarget
          ? "bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 -ml-3 -mr-3"
          : ""
      } transition-colors duration-500`}
    >
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <button
          onClick={() => onViewUser?.(comment.userId)}
          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
        >
          {comment.userAvatar ? (
            <img
              src={comment.userAvatar}
              alt={comment.userName}
              className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm cursor-pointer hover:opacity-80 transition-opacity">
              {comment.userName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <button
              onClick={() => onViewUser?.(comment.userId)}
              className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none focus:underline"
            >
              {comment.userName}
            </button>
            {isAuthor && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-medium">
                Creator
              </span>
            )}
            {comment.userRole === "flashy" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium shadow-sm">
                ⚡ Flashy
              </span>
            )}
            {comment.userRole === "moderator" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium shadow-sm">
                🛡️ Moderator
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Comment Text */}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap break-words">
            {comment.text}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Reply Button */}
            <button
              onClick={() =>
                onReply(
                  comment.id,
                  comment.userName,
                  rootCommentId || comment.id,
                )
              }
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>

            {/* Delete Button - Show for moderators and superusers */}
            {canDelete && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}

            {/* Spacer */}
            <div className="w-4" />

            {/* Like Button */}
            <button
              onClick={handleLikeComment}
              disabled={liking || !user}
              className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                hasLiked
                  ? "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              }`}
            >
              <Heart className={`w-3 h-3 ${hasLiked ? "fill-current" : ""}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Flag Button - Show for all comments except the user's own */}
            {!isOwnComment && onFlagComment && (
              <button
                onClick={() => onFlagComment(comment.id, comment.text)}
                className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium flex items-center gap-1 transition-colors"
              >
                <Flag className="w-3 h-3" />
                Report
              </button>
            )}
          </div>

          {/* View Replies Button - Only show for level 0 (top-level comments) */}
          {level === 0 && replyCount > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
              >
                {showReplies
                  ? `Hide ${replyCount} ${
                      replyCount === 1 ? "reply" : "replies"
                    }`
                  : `View ${replyCount} ${
                      replyCount === 1 ? "reply" : "replies"
                    }`}
              </button>
            </div>
          )}

          {/* Nested Replies - Only show for level 0 when expanded */}
          {level === 0 &&
            showReplies &&
            comment.replies &&
            comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.slice(0, visibleReplies).map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onReply={onReply}
                    level={1}
                    deckAuthorId={deckAuthorId}
                    targetCommentId={targetCommentId}
                    rootCommentId={comment.id}
                    onViewUser={onViewUser}
                    onFlagComment={onFlagComment}
                    onCommentDeleted={onCommentDeleted}
                  />
                ))}

                {/* Load More Replies Button */}
                {hasMoreReplies && (
                  <button
                    onClick={() => setVisibleReplies((prev) => prev + 5)}
                    className="ml-8 mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                  >
                    Load more replies ({replyCount - visibleReplies} remaining)
                  </button>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Delete Comment Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason for deleting this comment. The user will be
              notified with your reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label
                htmlFor="delete-reason"
                className="text-sm font-medium mb-2 block"
              >
                Reason for deletion *
              </Label>
              <Select value={deleteReason} onValueChange={setDeleteReason}>
                <SelectTrigger id="delete-reason" className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Harassment or Bullying">
                    Harassment or Bullying
                  </SelectItem>
                  <SelectItem value="Inappropriate Language">
                    Inappropriate Language
                  </SelectItem>
                  <SelectItem value="Spam">Spam</SelectItem>
                  <SelectItem value="Misinformation">Misinformation</SelectItem>
                  <SelectItem value="Off-topic">Off-topic</SelectItem>
                  <SelectItem value="Violation of Community Guidelines">
                    Violation of Community Guidelines
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="delete-message"
                className="text-sm font-medium mb-2 block"
              >
                Additional details (optional)
              </Label>
              <Textarea
                id="delete-message"
                value={deleteMessage}
                onChange={(e) => setDeleteMessage(e.target.value)}
                placeholder="Add any additional context..."
                className="w-full min-h-[80px]"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              disabled={deleteLoading || !deleteReason}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Deleting..." : "Delete Comment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
