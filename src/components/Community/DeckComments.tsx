import { useState, useEffect } from 'react'
import { useStore } from '../../../store/useStore'
import { Button } from '../../ui/button'
import { MessageCircle, Send, Reply } from 'lucide-react'
import * as api from '../../../utils/api'
import { toast } from 'sonner'

interface Comment {
  id: string
  deckId: string
  userId: string
  userName: string
  userAvatar: string | null
  text: string
  parentId: string | null
  createdAt: string
  replies: Comment[]
}

interface DeckCommentsProps {
  deckId: string
  deckAuthorId?: string
}

function CommentItem({ 
  comment, 
  onReply, 
  level = 0, 
  deckAuthorId 
}: { 
  comment: Comment
  onReply: (commentId: string, userName: string) => void
  level?: number
  deckAuthorId?: string
}) {
  const maxLevel = 3 // Maximum nesting level
  const isAuthor = deckAuthorId && comment.userId === deckAuthorId

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4' : 'mt-4'} ${level === 0 ? 'pb-4 border-b border-gray-200 dark:border-gray-700' : ''}`}>
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        {comment.userAvatar ? (
          <img
            src={comment.userAvatar}
            alt={comment.userName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">
            {comment.userName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{comment.userName}</span>
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

          {/* Reply Button */}
          {level < maxLevel && (
            <button
              onClick={() => onReply(comment.id, comment.userName)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  level={level + 1}
                  deckAuthorId={deckAuthorId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DeckComments({ deckId, deckAuthorId }: DeckCommentsProps) {
  const { user, accessToken } = useStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null)

  useEffect(() => {
    loadComments()
  }, [deckId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const fetchedComments = await api.getDeckComments(deckId)
      setComments(fetchedComments)
    } catch (error) {
      console.error('Failed to load comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handlePostComment = async () => {
    if (!accessToken || !user) {
      toast.error('Please log in to comment')
      return
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    setPosting(true)
    try {
      await api.postDeckComment(
        accessToken,
        deckId,
        commentText.trim(),
        replyingTo?.id
      )
      
      toast.success(replyingTo ? 'Reply posted!' : 'Comment posted!')
      setCommentText('')
      setReplyingTo(null)
      await loadComments()
    } catch (error) {
      console.error('Failed to post comment:', error)
      toast.error('Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, userName })
    setCommentText(`@${userName} `)
    // Focus on textarea
    document.querySelector('textarea')?.focus()
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setCommentText('')
  }

  const totalComments = comments.reduce((count, comment) => {
    const countReplies = (c: Comment): number => {
      return 1 + (c.replies?.reduce((sum, reply) => sum + countReplies(reply), 0) || 0)
    }
    return count + countReplies(comment)
  }, 0)

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
              {(user?.displayName || user?.name || '?').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : 'Write a comment...'}
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
                {posting ? 'Posting...' : replyingTo ? 'Post Reply' : 'Post Comment'}
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
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              deckAuthorId={deckAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
