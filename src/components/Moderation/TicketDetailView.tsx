import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { toast } from 'sonner'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { ArrowLeft, Send, Flag, CheckCircle, XCircle, Clock, MessageSquare, AtSign, AlertTriangle, ArrowUpCircle, Eye } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import { UserWarningDialog } from './UserWarningDialog'
import { FlagEscalationDialog } from './FlagEscalationDialog'
import { FlagResolutionDialog } from './FlagResolutionDialog'
import * as api from '../../../utils/api/moderation'

interface TicketComment {
  id: string
  ticketId: string
  userId: string
  userName: string
  content: string
  mentions: string[]
  createdAt: string
}

interface TicketAction {
  id: string
  ticketId: string
  actionType: 'status_change' | 'assignment' | 'unassignment' | 'resolution' | 'creation' | 'escalation' | 'warning'
  performedBy: string
  performedById: string
  timestamp: string
  details: {
    oldValue?: string
    newValue?: string
    reason?: string
    assignedTo?: string
    assignedToId?: string
    previouslyAssignedTo?: string
    previouslyAssignedToId?: string
    escalationReason?: string
    // Warning-specific fields
    warningId?: string
    customMessage?: string
    timeToResolve?: number
    deadline?: string
    targetType?: string
    targetId?: string
    targetName?: string
    warnedUserId?: string
  }
}

interface TicketDetails {
  id: string
  title: string | null
  category: string
  priority: string
  status: string
  description: string
  targetType: string | null
  targetId: string | null
  createdBy: string | null
  createdById: string | null
  createdByDisplayName: string | null
  assignedTo: string | null
  assignedToId: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  resolvedById: string | null
  resolvedByDisplayName: string | null
  resolutionNote: string | null
  relatedFlagId: string | null
  relatedUserId: string | null
  relatedDeckId: string | null
  relatedCardId: string | null
  relatedCommentId: string | null
  isEscalated: boolean | null
  relatedUserDisplayName: string | null
  flaggedUserDisplayName: string | null
  flagReason: string | null
  flagAdditionalDetails: string | null
  createdAt: string
  updatedAt: string
}

interface TimelineItem {
  id: string
  type: 'comment' | 'action'
  timestamp: string
  data: TicketComment | TicketAction
}

interface TicketDetailViewProps {
  ticketId: string
  onBack: () => void
}

export function TicketDetailView({ ticketId, onBack }: TicketDetailViewProps) {
  const { user, accessToken, setViewingCommunityDeckId, setTargetCardIndex, setViewingUserId } = useStore()
  const { navigateTo } = useNavigation()
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [actions, setActions] = useState<TicketAction[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [availableModerators, setAvailableModerators] = useState<{ id: string; name: string }[]>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolutionAction, setResolutionAction] = useState<'resolved' | 'dismissed'>('resolved')
  const [warnDialogOpen, setWarnDialogOpen] = useState(false)
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false)
  const [flagResolutionDialogOpen, setFlagResolutionDialogOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadTicketDetails()
    loadModerators()
  }, [ticketId])

  const loadTicketDetails = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const [ticketData, commentsData, actionsData] = await Promise.all([
        api.getTicketDetails(accessToken, ticketId),
        api.getTicketComments(accessToken, ticketId),
        api.getTicketActions(accessToken, ticketId)
      ])
      console.log(`Ticket Data:`, ticketData)
      console.log('Comments GET response:', commentsData)
      console.log('Comments data keys:', Object.keys(commentsData))
      console.log('Actions GET response:', actionsData)
      console.log('Actions data keys:', Object.keys(actionsData))
      
      setTicket(ticketData)
      
      // Handle different response formats for comments
      const commentsList = commentsData.comments || commentsData.data || commentsData || []
      console.log('Setting comments to:', commentsList)
      setComments(Array.isArray(commentsList) ? commentsList : [])
      
      // Handle different response formats for actions
      const actionsList = actionsData.actions || actionsData.data || actionsData || []
      console.log('Setting actions to:', actionsList)
      setActions(Array.isArray(actionsList) ? actionsList : [])
    } catch (error) {
      console.error('Failed to load ticket details:', error)
      toast.error('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const loadModerators = async () => {
    if (!accessToken) return
    
    try {
      const data = await api.getModerators(accessToken)
      console.log('Moderators API response:', data)
      console.log('Moderators array:', data.moderators)
      console.log('Full data keys:', Object.keys(data))
      
      // Handle different response formats
      const moderatorsList = data.moderators || data.data || data || []
      console.log('Setting moderators to:', moderatorsList)
      setAvailableModerators(Array.isArray(moderatorsList) ? moderatorsList : [])
    } catch (error) {
      console.error('Failed to load moderators:', error)
    }
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursor = e.target.selectionStart

    setCommentText(value)
    setCursorPosition(cursor)

    const textBeforeCursor = value.substring(0, cursor)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt)
        setShowMentionMenu(true)
      } else {
        setShowMentionMenu(false)
      }
    } else {
      setShowMentionMenu(false)
    }
  }

  const insertMention = (moderator: { id: string; name: string }) => {
    const textBeforeCursor = commentText.substring(0, cursorPosition)
    const textAfterCursor = commentText.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    const newText =
      commentText.substring(0, lastAtIndex) +
      `@${moderator.name} ` +
      textAfterCursor

    setCommentText(newText)
    setShowMentionMenu(false)

    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1]
      const moderator = availableModerators.find(m => m.name === mentionedName)
      if (moderator) {
        mentions.push(moderator.id)
      }
    }

    return mentions
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !accessToken) return

    setSubmitting(true)
    try {
      const mentions = extractMentions(commentText)
      console.log('Submitting comment:', { content: commentText, mentions })
      
      const data = await api.addTicketComment(accessToken, ticketId, {
        content: commentText,
        mentions
      })
      
      console.log('Comment response:', data)
      console.log('Comment data keys:', Object.keys(data))

      // Handle different response formats
      const newComment = data.comment || data.data || data
      console.log('New comment:', newComment)
      
      if (newComment) {
        setComments([...comments, newComment])
        setCommentText('')
        toast.success('Comment added')
      } else {
        console.error('No comment in response')
        toast.error('Comment response missing data')
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'resolved' || newStatus === 'dismissed') {
      setResolutionAction(newStatus as 'resolved' | 'dismissed')
      setResolutionDialogOpen(true)
      return
    }

    if (!accessToken) return

    setUpdatingStatus(true)
    try {
      await api.updateTicketStatus(accessToken, ticketId, { status: newStatus as any })
      await loadTicketDetails()
      toast.success('Status updated')
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleResolveOrDismiss = async () => {
    if (!resolutionNote.trim()) {
      toast.error('Please provide a resolution note')
      return
    }

    if (!accessToken) return

    setUpdatingStatus(true)
    try {
      await api.updateTicketStatus(accessToken, ticketId, {
        status: resolutionAction as any,
        resolutionNote,
        resolutionReason: resolutionAction === 'resolved' ? 'approved' : 'rejected' 
      })

      await loadTicketDetails()
      setResolutionDialogOpen(false)
      setResolutionNote('')
      toast.success(`Ticket ${resolutionAction}`)
    } catch (error) {
      console.error('Failed to resolve/dismiss ticket:', error)
      toast.error('Failed to update ticket')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAssignTicket = async (moderatorId: string) => {
    if (!accessToken) return
    
    setUpdatingStatus(true)
    try {
      await api.assignTicket(accessToken, ticketId, moderatorId)
      await loadTicketDetails()
      toast.success('Ticket assigned')
    } catch (error) {
      console.error('Failed to assign ticket:', error)
      toast.error('Failed to assign ticket')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleViewTarget = () => {
    if (!ticket) return

    const targetType = ticket.targetType
    console.log('navigating to target', ticket)
    
    if (targetType === 'deck' && ticket.relatedDeckId) {
      setViewingCommunityDeckId(ticket.relatedDeckId)
      setTargetCardIndex(null)
      navigateTo('community')
      toast.info(`Viewing flagged deck`)
    } else if (targetType === 'user' && ticket.relatedUserId) {
      setViewingUserId(ticket.relatedUserId)
      navigateTo('community')
      toast.info('Viewing flagged user')
    } else if (targetType === 'card' && ticket.relatedDeckId) {
      setViewingCommunityDeckId(ticket.relatedDeckId)
      // Extract card index if available from targetId
      const cardIndexMatch = ticket.relatedCardId?.match(/-card-(\d+)/)
      if (cardIndexMatch) {
        const cardIndex = parseInt(cardIndexMatch[1])
        setTargetCardIndex(cardIndex)
        toast.info(`Viewing card #${cardIndex + 1} in deck`)
      }
      navigateTo('community')
    } else if (targetType === 'comment' && ticket.relatedDeckId) {
      // Navigate to the deck with the comment
      setViewingCommunityDeckId(ticket.relatedDeckId)
      setTargetCardIndex(null)
      navigateTo('community')
      toast.info('Viewing deck with flagged comment')
    } else {
      toast.error('Cannot navigate to target')
    }
  }

  const handleWarnUser = () => {
    setWarnDialogOpen(true)
  }

  const handleEscalate = () => {
    setEscalateDialogOpen(true)
  }

  const handleResolveFlag = () => {
    setFlagResolutionDialogOpen(true)
  }

  const handleWarnSubmit = async (warning: {
    reason: string
    customReason?: string
    message?: string
    timeToResolve: string
    customTime?: string
  }) => {
    if (!accessToken || !ticket) return
    
    try {
      await api.warnUser(accessToken, ticket.id, warning)
      toast.success('Warning sent to user')
      setWarnDialogOpen(false)
      await loadTicketDetails()
    } catch (error: any) {
      console.error('❌ Failed to warn user:', error)
      toast.error(error.message || 'Failed to warn user')
      throw error
    }
  }

  const handleEscalateSubmit = async (reason: string) => {
    if (!accessToken || !ticket) return
    
    try {
      await api.escalateTicket(accessToken, ticket.id, reason)
      toast.success('Ticket escalated to admin')
      setEscalateDialogOpen(false)
      await loadTicketDetails()
    } catch (error: any) {
      console.error('❌ Failed to escalate ticket:', error)
      toast.error(error.message || 'Failed to escalate ticket')
      throw error
    }
  }

  const handleResolveSubmit = async (resolutionReason: 'approved' | 'rejected' | 'removed', moderatorNotes: string) => {
    if (!accessToken || !ticket) return
    
    try {
      await api.updateTicketStatus(accessToken, ticket.id, {
        status: 'resolved',
        resolutionNote: moderatorNotes || 'Resolved',
        resolutionReason: resolutionReason
      })

      toast.success('Ticket resolved')
      setFlagResolutionDialogOpen(false)
      await loadTicketDetails()
    } catch (error: any) {
      console.error('❌ Failed to resolve ticket:', error)
      toast.error(error.message || 'Failed to resolve ticket')
      throw error
    }
  }

  // Combine comments and actions into timeline
  const timeline: TimelineItem[] = [
    ...comments.map(comment => ({
      id: comment.id,
      type: 'comment' as const,
      timestamp: comment.createdAt,
      data: comment
    })),
    ...actions.map(action => ({
      id: action.id,
      type: 'action' as const,
      timestamp: action.timestamp,
      data: action
    }))
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const filteredModerators = availableModerators.filter(mod =>
    mod && mod.name && mod.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'reviewing': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'resolved': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'dismissed': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />
      case 'reviewing': return <Flag className="w-4 h-4" />
      case 'resolved': return <CheckCircle className="w-4 h-4" />
      case 'dismissed': return <XCircle className="w-4 h-4" />
      default: return <Flag className="w-4 h-4" />
    }
  }

  const renderActionDescription = (action: TicketAction) => {
    switch (action.actionType) {
      case 'creation':
        return <span>created this ticket</span>
      case 'status_change':
        return (
          <span>
            changed status from <span className="font-medium">{action.details.oldValue}</span> to{' '}
            <span className="font-medium">{action.details.newValue}</span>
          </span>
        )
      case 'assignment':
        const isSelfAssignment = action.performedById === action.details.assignedToId
        const isReassignment = action.details.previouslyAssignedTo
        const assignedToName = action.details.assignedToId === user?.id ? 'you' : action.details.assignedTo
        const previouslyAssignedToName = action.details.previouslyAssignedTo
        return (
          <span>
            {isReassignment ? (
              <>
                reassigned this ticket from <span className="font-medium">{previouslyAssignedToName}</span> to{' '}
                {isSelfAssignment ? (
                  <>themselves</>
                ) : (
                  <span className="font-medium">{assignedToName}</span>
                )}
              </>
            ) : isSelfAssignment ? (
              <>took this ticket</>
            ) : (
              <>assigned this ticket to <span className="font-medium">{assignedToName}</span></>
            )}
          </span>
        )
      case 'unassignment':
        return (
          <span>
            unassigned this ticket from <span className="font-medium">{action.details.previouslyAssignedTo}</span>
          </span>
        )
      case 'resolution':
        return (
          <div>
            <span>resolved this ticket</span>
            {action.details.reason && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded p-2">
                {action.details.reason}
              </div>
            )}
          </div>
        )
      case 'escalation':
        return (
          <div>
            <span>escalated this ticket</span>
            {action.details.escalationReason && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded p-2">
                {action.details.escalationReason}
              </div>
            )}
          </div>
        )
      case 'warning':
        // Calculate time remaining
        const deadline = action.details.deadline ? new Date(action.details.deadline) : null
        const now = new Date()
        const timeRemaining = deadline ? Math.max(0, deadline.getTime() - now.getTime()) : 0
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
        
        return (
          <div className="space-y-2">
            <span>issued a warning to the user</span>
            
            {/* Warning Details Card */}
            <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 dark:border-orange-600 rounded">
              {/* Reason */}
              <div className="mb-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Reason:</span>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                  {action.details.reason}
                </p>
              </div>

              {/* Custom Message */}
              {action.details.customMessage && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Message:</span>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                    {action.details.customMessage}
                  </p>
                </div>
              )}

              {/* Time Remaining */}
              <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                {timeRemaining > 0 ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                      {hoursRemaining > 0 && `${hoursRemaining}h `}
                      {minutesRemaining}m remaining to address
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      Deadline expired
                    </span>
                  </div>
                )}
                {deadline && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Deadline: {deadline.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      default:
        return <span>performed an action</span>
    }
  }

  const highlightMentions = (text: string) => {
    return text.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-emerald-600 dark:text-emerald-400 font-medium">
            {part}
          </span>
        )
      }
      return part
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-emerald-600 dark:text-emerald-400">Loading ticket details...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">Ticket not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl text-gray-900 dark:text-gray-100">
                    {ticket.title || ticket.description || 'Untitled Ticket'}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {ticket.status.replace('_', ' ')}
                  </span>
                  {(ticket.isEscalated === true) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                      <ArrowUpCircle className="w-3 h-3" />
                      Escalated
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>
                    <span className="font-medium">Type:</span> {ticket.targetType || ticket.category}
                  </div>
                  <div>
                    <span className="font-medium">Reported by:</span> {ticket.flaggedUserDisplayName || ticket.createdBy || 'System'} •{' '}
                    {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                  {ticket.title && (
                    <div>
                      <span className="font-medium">Reason:</span> {ticket.title}
                    </div>
                  )}
                  {ticket.assignedTo && (
                    <div>
                      <span className="font-medium">Assigned to:</span> {ticket.assignedToId === user?.id ? 'you' : ticket.assignedTo}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleViewTarget}
                className="flex items-center gap-2 ml-4"
              >
                <Eye className="w-4 h-4" />
                View
              </Button>
            </div>

            {/* Ticket Details */}
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 rounded p-3">
                  {ticket.description || ticket.flagAdditionalDetails || 'No additional details provided'}
                </div>
              </div>
            </div>

            {/* Actions */}
            {ticket.status !== 'resolved' && ticket.status !== 'dismissed' && (
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Change Status
                  </label>
                  <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                    <SelectTrigger className="bg-white dark:bg-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Assign To
                  </label>
                  <Select
                    value={ticket.assignedToId || 'unassigned'}
                    onValueChange={(value) => {
                      if (value !== 'unassigned') {
                        handleAssignTicket(value)
                      }
                    }}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableModerators.map(mod => (
                        <SelectItem key={mod.id} value={mod.id}>
                          {mod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {ticket.status !== 'resolved' && ticket.status !== 'dismissed' && (
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  onClick={handleResolveFlag}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve Flag
                </Button>

                <Button
                  onClick={handleWarnUser}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Warn User
                </Button>

                <Button
                  onClick={handleEscalate}
                  disabled={ticket.isEscalated}
                  className={`flex items-center gap-2 ${
                    ticket.isEscalated 
                      ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  {ticket.isEscalated ? 'Escalated' : 'Escalate'}
                </Button>
              </div>
            )}

            {ticket.resolutionNote && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Note</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 bg-green-50 dark:bg-green-900/20 rounded p-3">
                  {ticket.resolutionNote}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Activity Timeline
          </h2>

          <div className="space-y-4">
            {timeline.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  {item.type === 'comment' ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  ) : (item.data as TicketAction).actionType === 'warning' ? (
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Flag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    {item.type === 'comment' ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {(item.data as TicketComment).userName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {highlightMentions((item.data as TicketComment).content)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {(item.data as TicketAction).actionType === 'creation' 
                                ? (ticket.createdByDisplayName || ticket.createdBy || 'System')
                                : (item.data as TicketAction).performedBy
                              }
                            </span>{' '}
                            {renderActionDescription(item.data as TicketAction)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          {ticket.status !== 'resolved' && ticket.status !== 'dismissed' && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  placeholder="Add a comment... (use @ to mention moderators)"
                  className="min-h-[100px] bg-white dark:bg-gray-800"
                  disabled={submitting}
                />

                {/* Mention Menu */}
                {showMentionMenu && filteredModerators.length > 0 && (
                  <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredModerators.map(mod => (
                      <button
                        key={mod.id}
                        onClick={() => insertMention(mod)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <AtSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">{mod.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleSubmitComment}
                  disabled={submitting || !commentText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Sending...' : 'Send Comment'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Dialog */}
      <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolutionAction === 'resolved' ? 'Resolve' : 'Dismiss'} Ticket
            </DialogTitle>
            <DialogDescription>
              Please provide a note explaining your decision
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Enter resolution note..."
              className="min-h-[100px]"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setResolutionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolveOrDismiss}
                disabled={updatingStatus || !resolutionNote.trim()}
                className={resolutionAction === 'resolved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-700'
                }
              >
                {updatingStatus ? 'Updating...' : resolutionAction === 'resolved' ? 'Resolve' : 'Dismiss'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <UserWarningDialog
        open={warnDialogOpen}
        onOpenChange={setWarnDialogOpen}
        onSubmit={handleWarnSubmit}
        flagDetails={
          ticket
            ? {
                targetType: ticket.targetType || 'unknown',
                targetName: ticket.relatedUserDisplayName || ticket.description || 'Unknown',
                reason: ticket.flagReason || ticket.category,
                reporterNotes: ticket.flagAdditionalDetails || ticket.description || '',
              }
            : undefined
        }
      />

      {/* Escalation Dialog */}
      <FlagEscalationDialog
        open={escalateDialogOpen}
        onOpenChange={setEscalateDialogOpen}
        onEscalate={handleEscalateSubmit}
        flagDetails={
          ticket
            ? {
                targetType: ticket.targetType || 'unknown',
                targetName: ticket.title || ticket.description || 'Unknown',
                reason: ticket.flagReason || ticket.category,
                reporterNotes: ticket.flagAdditionalDetails || ticket.description,
              }
            : undefined
        }
      />

      {/* Flag Resolution Dialog */}
      <FlagResolutionDialog
        open={flagResolutionDialogOpen}
        onOpenChange={setFlagResolutionDialogOpen}
        onResolve={handleResolveSubmit}
        flagDetails={
          ticket
            ? {
                targetType: ticket.targetType || 'unknown',
                targetName: ticket.title || ticket.description || 'Unknown',
                reason: ticket.flagReason || ticket.category,
                reporterNotes: ticket.flagAdditionalDetails || ticket.description,
              }
            : undefined
        }
      />
    </div>
  )
}