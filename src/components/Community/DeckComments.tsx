import { useState, useEffect } from "react";
import { useStore } from "@/shared/state/useStore";
import { Button } from "@/ui/button";
import { MessageCircle, Send, Reply } from "lucide-react";
import { getDeckComments, postDeckComment } from "../../../utils/api/community";
import { toast } from "sonner";
import { CommentItem, Comment } from "./CommentItem";

interface DeckCommentsProps {
  deckId: string;
  deckAuthorId?: string;
  targetCommentId?: string | null;
  onViewUser?: (userId: string) => void;
  onFlagComment?: (commentId: string, commentText: string) => void;
}

export function DeckComments({
  deckId,
  deckAuthorId,
  targetCommentId,
  onViewUser,
  onFlagComment,
}: DeckCommentsProps) {
  const { user, accessToken } = useStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    userName: string;
  } | null>(null);
  const [visibleComments, setVisibleComments] = useState(10);

  const hasMoreComments = comments.length > visibleComments;

  useEffect(() => {
    loadComments();
  }, [deckId]);

  // Scroll to target comment when comments are loaded and targetCommentId is set
  useEffect(() => {
    if (targetCommentId && !loading && comments.length > 0) {
      // If the target comment is not in the visible range, show all comments up to it
      const targetIndex = comments.findIndex(
        (c) =>
          c.id === targetCommentId ||
          c.replies?.some((r) => r.id === targetCommentId)
      );
      if (targetIndex >= visibleComments) {
        setVisibleComments(targetIndex + 1);
      }

      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        const targetElement = document.getElementById(targetCommentId);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 300);
    }
  }, [targetCommentId, loading, comments, visibleComments]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const fetchedComments = await getDeckComments(deckId);
      console.log("FETCHED COMMENTS:", fetchedComments);

      // Sort comments: top 3 by like count, then rest by newest first
      const sortedComments = [...fetchedComments].sort((a, b) => {
        const aLikes = a.likes?.length || 0;
        const bLikes = b.likes?.length || 0;

        // Both in top 3 or both outside top 3 - determine by likes first
        if (aLikes !== bLikes) {
          return bLikes - aLikes; // Higher likes first
        }

        // If same likes, sort by date (newest first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      // Separate top 3 most liked and the rest
      const top3 = sortedComments.slice(0, 3);
      const remaining = sortedComments.slice(3).sort((a, b) => {
        // Sort remaining by newest first
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      setComments([...top3, ...remaining]);
    } catch (error) {
      console.error("Failed to load comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!accessToken || !user) {
      toast.error("Please log in to comment");
      return;
    }

    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setPosting(true);
    try {
      await postDeckComment(
        accessToken,
        deckId,
        commentText.trim(),
        replyingTo?.id
      );

      toast.success(replyingTo ? "Reply posted!" : "Comment posted!");
      setCommentText("");
      setReplyingTo(null);
      await loadComments();
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, userName });
    setCommentText(`@${userName} `);
    // Focus on textarea
    document.querySelector("textarea")?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
  };

  const totalComments = comments.reduce((count, comment) => {
    const countReplies = (c: Comment): number => {
      return (
        1 +
        (c.replies?.reduce((sum, reply) => sum + countReplies(reply), 0) || 0)
      );
    };
    return count + countReplies(comment);
  }, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-lg sm:text-xl text-gray-900 dark:text-gray-100">
          Comments ({totalComments})
        </h2>
      </div>

      {/* Post Comment Form */}
      <div className="mb-6">
        {replyingTo && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Reply className="w-4 h-4" />
            <span>Replying to {replyingTo.userName}</span>
            <button
              onClick={cancelReply}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-3">
          {/* User Avatar */}
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">
              {(user?.displayName || user?.name || "?").charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                replyingTo
                  ? `Reply to ${replyingTo.userName}...`
                  : "Write a comment..."
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100 resize-none text-sm"
              rows={3}
              disabled={!user}
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handlePostComment}
                disabled={posting || !commentText.trim() || !user}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                {posting
                  ? "Posting..."
                  : replyingTo
                  ? "Post Reply"
                  : "Post Comment"}
              </Button>
            </div>
          </div>
        </div>
        {!user && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Please log in to post comments
          </p>
        )}
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.slice(0, visibleComments).map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              deckAuthorId={deckAuthorId}
              targetCommentId={targetCommentId}
              onViewUser={onViewUser}
              onFlagComment={onFlagComment}
              onCommentDeleted={loadComments}
            />
          ))}

          {/* Load More Comments Button */}
          {hasMoreComments && (
            <button
              onClick={() => setVisibleComments((prev) => prev + 10)}
              className="mt-4 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              Load more comments ({comments.length - visibleComments} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
