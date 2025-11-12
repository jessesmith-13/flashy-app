import { useState, useEffect } from 'react'
import { Reply } from 'lucide-react'

export interface Comment {
  id: string
  deckId: string
  userId: string
  userName: string
  userAvatar: string | null
  text: string
  parentId: string | null
  createdAt: string
  replies: Comment[]
  rootCommentId?: string // Track the root comment for nested replies
}

interface CommentItemProps {
  comment: Comment
  onReply: (commentId: string, userName: string, rootCommentId: string) => void
  level?: number
  deckAuthorId?: string
  targetCommentId?: string | null
  rootCommentId?: string
  onViewUser?: (userId: string) => void
}

export function CommentItem({ 
  comment, 
  onReply, 
  level = 0, 
  deckAuthorId,
  targetCommentId,
  rootCommentId,
  onViewUser
}: CommentItemProps) {
  const isAuthor = deckAuthorId && comment.userId === deckAuthorId
  const isTarget = targetCommentId === comment.id
  const [showReplies, setShowReplies] = useState(false)
  const [visibleReplies, setVisibleReplies] = useState(5)

  const replyCount = comment.replies?.length || 0
  const hasMoreReplies = replyCount > visibleReplies

  // Auto-expand replies if this comment or any of its replies is the target
  useEffect(() => {
    if (level === 0 && targetCommentId) {
      const isReplyTarget = comment.replies?.some(r => r.id === targetCommentId)
      if (comment.id === targetCommentId || isReplyTarget) {
        setShowReplies(true)
        // Show all replies if one is targeted
        if (isReplyTarget) {
          setVisibleReplies(replyCount)
        }
      }
    }
  }, [targetCommentId, comment.id, comment.replies, level, replyCount])

  return (
    <div 
      id={comment.id}
      className={`${level > 0 ? 'ml-8 mt-4' : 'mt-4'} ${level === 0 ? 'pb-4 border-b border-gray-200 dark:border-gray-700' : ''} ${isTarget ? 'bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 -ml-3 -mr-3' : ''} transition-colors duration-500`}
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
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Comment Text */}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap break-words">
            {comment.text}
          </p>

          {/* Reply Button - Always show for all comments */}
          <button
            onClick={() => onReply(comment.id, comment.userName, rootCommentId || comment.id)}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>

          {/* View Replies Button - Only show for level 0 (top-level comments) */}
          {level === 0 && replyCount > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
              >
                {showReplies ? `Hide ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </button>
            </div>
          )}

          {/* Nested Replies - Only show for level 0 when expanded */}
          {level === 0 && showReplies && comment.replies && comment.replies.length > 0 && (
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
                />
              ))}
              
              {/* Load More Replies Button */}
              {hasMoreReplies && (
                <button
                  onClick={() => setVisibleReplies(prev => prev + 5)}
                  className="ml-8 mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                >
                  Load more replies ({replyCount - visibleReplies} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
