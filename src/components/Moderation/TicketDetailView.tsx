import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import * as api from '../../../utils/api'
import { toast } from 'sonner'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { ArrowLeft, Send, Flag, CheckCircle, XCircle, Clock, User, MessageSquare, AtSign, AlertTriangle, ArrowUpCircle, Eye } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import { FlagResolutionDialog } from './FlagResolutionDialog'
import { UserWarningDialog } from './UserWarningDialog'
import { FlagEscalationDialog } from './FlagEscalationDialog'

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
  actionType: 'status_change' | 'assignment' | 'unassignment' | 'resolution' | 'creation' | 'escalation'
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
    escalationReason?: string
  }
}

interface TicketDetails {
  id: string
  itemType: 'deck' | 'card'
  itemId: string
  itemName: string
  reason: string
  details: string
  reportedBy: string
  reportedById: string
  reportedAt: string
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed'
  assignedTo?: string
  assignedToId?: string
  resolvedAt?: string
  resolutionNote?: string
  deckId?: string
  isEscalated?: boolean
  escalatedBy?: string
  escalatedByName?: string
  escalationReason?: string
  escalatedAt?: string
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
  const { user, accessToken, setViewingCommunityDeckId, setTargetCardIndex, setTargetCommentId } = useStore()
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
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false)
  const [warnUserDialogOpen, setWarnUserDialogOpen] = useState(false)
  const [flagResolutionDialogOpen, setFlagResolutionDialogOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadTicketDetails()
    loadModerators()
  }, [ticketId])

  const loadTicketDetails = async () => {
    try {
      setLoading(true)
      const [ticketData, commentsData, actionsData] = await Promise.all([
        api.getTicketDetails(accessToken, ticketId),
        api.getTicketComments(accessToken, ticketId),
        api.getTicketActions(accessToken, ticketId)
      ])
      
      setTicket(ticketData)
      setComments(commentsData)
      setActions(actionsData)
    } catch (error) {
      console.error('Failed to load ticket details:', error)
      toast.error('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const loadModerators = async () => {
    try {
      const moderators = await api.getModerators(accessToken)
      setAvailableModerators(moderators)
    } catch (error) {
      console.error('Failed to load moderators:', error)
    }
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursor = e.target.selectionStart
    
    setCommentText(value)
    setCursorPosition(cursor)

    // Check if user typed @ to trigger mention menu
    const textBeforeCursor = value.substring(0, cursor)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Only show menu if there's no space after @ (still typing the mention)
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
    
    // Focus back on textarea
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
    if (!commentText.trim()) return

    setSubmitting(true)
    try {
      const mentions = extractMentions(commentText)
      const newComment = await api.addTicketComment(accessToken, ticketId, {
        content: commentText,
        mentions
      })
      
      setComments([...comments, newComment])
      setCommentText('')
      toast.success('Comment added')
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

    setUpdatingStatus(true)
    try {
      await api.updateTicketStatus(accessToken, ticketId, {
        status: newStatus as any,
      })
      
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

    setUpdatingStatus(true)
    try {
      await api.updateTicketStatus(accessToken, ticketId, {
        status: resolutionAction,
        resolutionNote
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

  const handleUnassignTicket = async () => {
    setUpdatingStatus(true)
    try {
      await api.unassignTicket(accessToken, ticketId)
      await loadTicketDetails()
      toast.success('Ticket unassigned')
    } catch (error) {
      console.error('Failed to unassign ticket:', error)
      toast.error('Failed to unassign ticket')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleEscalate = async (reason: string) => {
    try {
      await api.escalateFlag(accessToken, ticketId, reason)
      await loadTicketDetails()
      toast.success('Flag escalated to administrators')
    } catch (error) {
      console.error('Failed to escalate flag:', error)
      toast.error('Failed to escalate flag')
      throw error
    }
  }

  const handleWarnUser = async (warning: {
    reason: string
    customReason?: string
    message?: string
    timeToResolve: string
    customTime?: string
  }) => {
    try {
      await api.warnUser(accessToken, ticketId, warning)
      await loadTicketDetails()
      toast.success('Warning sent to user')
    } catch (error) {
      console.error('Failed to warn user:', error)
      toast.error('Failed to send warning')
      throw error
    }
  }

  const handleResolveFlag = async (resolutionReason: 'approved' | 'rejected' | 'removed', moderatorNotes: string) => {
    try {
      await api.resolveFlag(accessToken, ticketId, resolutionReason, moderatorNotes)
      await loadTicketDetails()
      toast.success('Flag resolved')
    } catch (error) {
      console.error('Failed to resolve flag:', error)
      toast.error('Failed to resolve flag')
      throw error
    }
  }

  const handleViewTarget = () => {
    if (ticket?.itemType === 'deck') {
      setViewingCommunityDeckId(ticket.itemId)
      setTargetCardIndex(null)
      navigateTo('community')
      toast.info(`Viewing flagged deck: ${ticket.itemName}`)
    } else if (ticket?.itemType === 'card' && ticket.deckId) {
      setViewingCommunityDeckId(ticket.deckId)
      // Extract card index if available from itemId
      const cardIndexMatch = ticket.itemId.match(/-card-(\d+)/)
      if (cardIndexMatch) {
        const cardIndex = parseInt(cardIndexMatch[1])
        setTargetCardIndex(cardIndex)
        toast.info(`Viewing card #${cardIndex + 1} in deck`)
      }
      navigateTo('community')
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
    mod.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'under_review': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'resolved': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'dismissed': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'under_review': return <Flag className="w-4 h-4" />
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
        // Check if the person who performed the action is the same as who it's assigned to
        const isSelfAssignment = action.performedById === action.details.assignedToId
        const isReassignment = action.details.previouslyAssignedTo
        const assignedToName = action.details.assignedToId === user?.id ? 'you' : action.details.assignedTo
        const previouslyAssignedToName = action.details.previouslyAssignedTo // We don't have the ID for this, so can't check
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
                    {ticket.itemName}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {ticket.status.replace('_', ' ')}
                  </span>
                  {ticket.isEscalated && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                      <ArrowUpCircle className="w-3 h-3" />
                      Escalated
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>
                    <span className="font-medium">Type:</span> {ticket.itemType}
                  </div>
                  <div>
                    <span className="font-medium">Reported by:</span> {ticket.reportedBy} •{' '}
                    {new Date(ticket.reportedAt).toLocaleString()}
                  </div>
                  {ticket.assignedTo && (
                    <div>
                      <span className="font-medium">Assigned to:</span> {ticket.assignedToId === user?.id ? 'you' : ticket.assignedTo}
                    </div>
                  )}
                  {ticket.isEscalated && (
                    <div>
                      <span className="font-medium">Escalated by:</span> {ticket.escalatedByName} •{' '}
                      {ticket.escalatedAt && new Date(ticket.escalatedAt).toLocaleString()}
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
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</div>
                <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.reason}</div>
              </div>
              {ticket.details && (
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 rounded p-3">
                    {ticket.details}
                  </div>
                </div>
              )}
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
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
            
            {/* Additional Action Buttons for Under Review tickets */}
            {ticket.status === 'under_review' && (
              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setFlagResolutionDialogOpen(true)}
                  className="flex items-center gap-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve Flag
                </Button>
                {!ticket.isEscalated && (
                  <Button
                    variant="outline"
                    onClick={() => setEscalationDialogOpen(true)}
                    className="flex items-center gap-2 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    Escalate to Admin
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setWarnUserDialogOpen(true)}
                  className="flex items-center gap-2 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Warn User
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
                              {(item.data as TicketAction).performedBy}
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

      {/* Escalation Dialog */}
      {ticket && (
        <FlagEscalationDialog
          open={escalationDialogOpen}
          onOpenChange={setEscalationDialogOpen}
          onEscalate={handleEscalate}
          flagDetails={{
            targetType: ticket.itemType,
            targetName: ticket.itemName,
            reason: ticket.reason,
            reporterNotes: ticket.details
          }}
        />
      )}

      {/* Warn User Dialog */}
      {ticket && (
        <UserWarningDialog
          open={warnUserDialogOpen}
          onOpenChange={setWarnUserDialogOpen}
          onSubmit={handleWarnUser}
          flagDetails={{
            targetType: ticket.itemType,
            targetName: ticket.itemName,
            reason: ticket.reason,
            reporterNotes: ticket.details
          }}
        />
      )}

      {/* Flag Resolution Dialog */}
      {ticket && (
        <FlagResolutionDialog
          open={flagResolutionDialogOpen}
          onOpenChange={setFlagResolutionDialogOpen}
          onResolve={handleResolveFlag}
          flagDetails={{
            targetType: ticket.itemType,
            targetName: ticket.itemName,
            reason: ticket.reason,
            reporterNotes: ticket.details
          }}
        />
      )}
    </div>
  )
}