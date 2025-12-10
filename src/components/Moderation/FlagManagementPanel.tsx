import { useState, useEffect, useMemo } from 'react'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Card } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { AlertTriangle, CheckCircle, Clock, Eye, Flag, ExternalLink, FileText, ChevronLeft, ChevronRight, ArrowUpCircle, RefreshCw, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { getFlags, updateFlagStatus } from '../../../utils/api'
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs'
import { useNavigation } from '../../../hooks/useNavigation'
import { useStore } from '../../../store/useStore'
import { FlagResolutionDialog } from './FlagResolutionDialog'
import { UserWarningDialog } from './UserWarningDialog'
import { FlagEscalationDialog } from './FlagEscalationDialog'
import { TicketDetailView } from './TicketDetailView'
import { projectId } from '../../../utils/supabase/info'

interface FlagData {
  id: string
  reporterId: string
  reporterName: string
  targetType: 'deck' | 'user' | 'comment' | 'card'
  targetId: string
  targetName: string
  targetDetails?: any
  targetUserId?: string
  targetUserName?: string
  reason: string
  notes: string
  status: 'open' | 'reviewing' | 'resolved'
  createdAt: string
  resolvedAt: string | null
  resolutionReason?: 'approved' | 'rejected' | 'removed'
  moderatorNotes?: string
  resolvedByName?: string
  reviewingBy?: string
  reviewingByName?: string
  isEscalated?: boolean
  escalatedBy?: string
  escalatedByName?: string
  escalationReason?: string
  escalatedAt?: string
}

interface FlagManagementPanelProps {
  accessToken: string
}

export function FlagManagementPanel({ accessToken }: FlagManagementPanelProps) {
  const [allFlags, setAllFlags] = useState<FlagData[]>([]) // Store ALL flags
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'open' | 'reviewing' | 'resolved' | 'all'>('open')
  const [typeFilter, setTypeFilter] = useState<'all' | 'deck' | 'user' | 'comment' | 'card'>('all')
  const [showFlashyOnly, setShowFlashyOnly] = useState(false)
  const [showEscalatedOnly, setShowEscalatedOnly] = useState(false)
  const [showMyTicketsOnly, setShowMyTicketsOnly] = useState(false)
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false)
  const [selectedFlag, setSelectedFlag] = useState<FlagData | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const { navigateTo, navigate } = useNavigation()
  const { setViewingCommunityDeckId, setViewingUserId, setTargetCommentId, setTargetCardIndex, user, viewingTicketId, setViewingTicketId } = useStore()

  // Load all flags on mount
  useEffect(() => {
    loadAllFlags()
  }, [])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, typeFilter, showFlashyOnly, showEscalatedOnly, showMyTicketsOnly])

  // Apply filters client-side using useMemo for performance
  const filteredFlags = useMemo(() => {
    console.log('🔍 Filtering flags client-side...')
    console.log('Status filter:', statusFilter)
    console.log('Type filter:', typeFilter)
    console.log('Flashy only:', showFlashyOnly)
    console.log('Escalated only:', showEscalatedOnly)
    console.log('My tickets only:', showMyTicketsOnly)
    console.log('Total flags before filtering:', allFlags.length)
    
    let filtered = allFlags

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(flag => flag.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(flag => flag.targetType === typeFilter)
    }

    // Flashy filter - client-side
    // When showFlashyOnly is true: show ONLY Flashy content
    // When showFlashyOnly is false: show ONLY non-Flashy content
    if (showFlashyOnly) {
      filtered = filtered.filter(flag => flag.targetUserName?.toLowerCase() === 'flashy')
    } else {
      filtered = filtered.filter(flag => flag.targetUserName?.toLowerCase() !== 'flashy')
    }

    // Escalated filter
    if (showEscalatedOnly) {
      filtered = filtered.filter(flag => flag.isEscalated === true)
    }

    // My tickets filter
    if (showMyTicketsOnly && user) {
      filtered = filtered.filter(flag => {
        // Match by user ID if reviewingBy is available
        if (flag.reviewingBy === user.id) {
          return true
        }
        // Fallback to name matching
        const userName = user.displayName || user.name
        return flag.reviewingByName === userName
      })
    }

    console.log('✅ Filtered flags count:', filtered.length)
    return filtered
  }, [allFlags, statusFilter, typeFilter, showFlashyOnly, showEscalatedOnly, showMyTicketsOnly, user])

  const loadAllFlags = async () => {
    console.log('🔍 Loading ALL flags...')
    setLoading(true)
    try {
      // Load ALL flags without any filters - we'll filter client-side
      console.log('🔍 Fetching all flags from server...')
      const fetchedFlags = await getFlags(accessToken, {})
      console.log('✅ Fetched flags:', fetchedFlags.length)
      setAllFlags(fetchedFlags)
    } catch (error: any) {
      console.error('❌ Failed to load flags:', error)
      toast.error(error.message || 'Failed to load flags')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (flagId: string, newStatus: 'open' | 'reviewing' | 'resolved') => {
    try {
      await updateFlagStatus(accessToken, flagId, newStatus)
      toast.success(`Flag status updated to ${newStatus}`)
      loadAllFlags()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update flag status')
    }
  }

  const handleOpenResolutionDialog = (flag: FlagData) => {
    setSelectedFlag(flag)
    setResolutionDialogOpen(true)
  }

  const handleResolveFlag = async (resolutionReason: 'approved' | 'rejected' | 'removed', moderatorNotes: string) => {
    if (!selectedFlag) return

    try {
      await updateFlagStatus(accessToken, selectedFlag.id, 'resolved', resolutionReason, moderatorNotes)
      toast.success(`Flag resolved as ${resolutionReason}`)
      loadAllFlags()
    } catch (error: any) {
      toast.error(error.message || 'Failed to resolve flag')
    }
  }
  
  const getResolutionReasonBadge = (reason: string) => {
    switch (reason) {
      case 'approved':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'removed':
        return <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"><FileText className="w-3 h-3 mr-1" />Removed</Badge>
      default:
        return null
    }
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      inappropriate: 'Inappropriate content',
      spam: 'Spam',
      harassment: 'Harassment / hate',
      misinformation: 'Misinformation',
      copyright: 'Copyright violation',
      other: 'Other'
    }
    return labels[reason] || reason
  }

  const getStatusBadge = (status: string) => {
    if (status === 'open') {
      return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Open</Badge>
    }
    if (status === 'reviewing') {
      return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Eye className="w-3 h-3 mr-1" />Reviewing</Badge>
    }
    return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      deck: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      user: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      comment: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      card: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    }
    return <Badge className={colors[type]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>
  }

  const handleViewTarget = (flag: FlagData) => {
    console.log('🔍 Navigating to flag target:', flag)
    
    switch (flag.targetType) {
      case 'deck':
        // Could be an actual deck flag OR an old card flag (before we fixed the code)
        // Check if targetId looks like a card ID (contains "-card-")
        if (flag.targetId.includes('-card-')) {
          console.log('🎴 Detected old card flag stored as deck type')
          // Extract deckId and cardIndex from card ID format: {deckId}-card-{cardIndex}
          const deckId = flag.targetId.split('-card-')[0]
          const cardIndex = parseInt(flag.targetId.split('-card-')[1])
          console.log(`✅ Extracted deckId: ${deckId}, cardIndex: ${cardIndex}`)
          setViewingCommunityDeckId(deckId)
          setTargetCardIndex(cardIndex)
          navigateTo('community')
          const cardNumber = cardIndex + 1
          toast.info(`Navigating to card #${cardNumber} in deck ${flag.targetDetails?.deckName || 'Unknown'}`)
        } else {
          // Real deck flag
          console.log(`✅ Setting viewingCommunityDeckId to ${flag.targetId}`)
          setViewingCommunityDeckId(flag.targetId)
          setTargetCardIndex(null) // Clear any previous card target
          navigateTo('community')
          toast.info(`Viewing flagged deck: ${flag.targetName}`)
        }
        break
      case 'user':
        // Navigate to community and set user to view
        console.log(`✅ Setting viewingUserId to ${flag.targetId}`)
        setViewingUserId(flag.targetId)
        navigateTo('community')
        break
      case 'comment':
        // Comments are associated with decks, so navigate to the deck with comment context
        if (flag.targetDetails?.deckId) {
          console.log(`✅ Navigating to deck ${flag.targetDetails.deckId} for comment ${flag.targetId}`)
          setViewingCommunityDeckId(flag.targetDetails.deckId)
          setTargetCommentId(flag.targetId)
          navigateTo('community')
        } else {
          toast.error('Cannot navigate to comment - deck information missing')
          console.error('❌ Comment flag missing deckId:', flag)
        }
        break
      case 'card':
        // Cards are associated with community decks, so navigate to community deck view
        console.log('🎴 Card flag - targetDetails:', flag.targetDetails)
        if (flag.targetDetails?.deckId && flag.targetDetails?.cardIndex !== undefined) {
          console.log(`✅ Navigating to community deck ${flag.targetDetails.deckId} for card at index ${flag.targetDetails.cardIndex}`)
          setViewingCommunityDeckId(flag.targetDetails.deckId)
          setTargetCardIndex(flag.targetDetails.cardIndex)
          navigateTo('community')
          toast.info(`Navigating to card #${flag.targetDetails.cardNumber} in deck ${flag.targetDetails.deckName || 'Unknown'}`)
        } else {
          toast.error('Cannot navigate to card - deck information missing')
          console.error('❌ Card flag missing deckId or cardIndex:', flag)
        }
        break
      default:
        toast.error('Unknown target type')
        console.error('❌ Unknown flag type:', flag)
    }
  }

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentFlags = filteredFlags.slice(indexOfFirstItem, indexOfLastItem)

  const totalPages = Math.ceil(filteredFlags.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const handleOpenWarningDialog = (flag: FlagData) => {
    setSelectedFlag(flag)
    setWarningDialogOpen(true)
  }

  const handleSubmitWarning = async (warning: {
    reason: string
    customReason?: string
    message?: string
    timeToResolve: string
    customTime?: string
  }) => {
    if (!selectedFlag || !selectedFlag.targetUserId) {
      toast.error('Cannot warn user - missing user information')
      return
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a1502a9/warnings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: selectedFlag.targetUserId,
          flagId: selectedFlag.id,
          reason: warning.reason,
          customReason: warning.customReason,
          message: warning.message,
          timeToResolve: warning.timeToResolve === 'custom' ? warning.customTime : warning.timeToResolve,
          targetType: selectedFlag.targetType,
          targetId: selectedFlag.targetId,
          targetName: selectedFlag.targetName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send warning')
      }

      toast.success(`Warning sent to ${selectedFlag.targetUserName}`)
      setWarningDialogOpen(false)
    } catch (error: any) {
      console.error('Failed to send warning:', error)
      toast.error(error.message || 'Failed to send warning')
      throw error
    }
  }

  const handleOpenEscalationDialog = (flag: FlagData) => {
    setSelectedFlag(flag)
    setEscalationDialogOpen(true)
  }

  const handleEscalateFlag = async (escalationReason: string) => {
    if (!selectedFlag) return

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a1502a9/flags/${selectedFlag.id}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          escalationReason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to escalate flag')
      }

      toast.success('Flag escalated to admin/superuser')
      setEscalationDialogOpen(false)
      loadAllFlags()
    } catch (error: any) {
      console.error('Failed to escalate flag:', error)
      toast.error(error.message || 'Failed to escalate flag')
      throw error
    }
  }

  // If viewing a ticket, render the TicketDetailView
  if (viewingTicketId) {
    return (
      <TicketDetailView 
        ticketId={viewingTicketId} 
        onBack={() => {
          setViewingTicketId(null)
          loadAllFlags() // Reload flags when returning to list
        }} 
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl">Flag Management</h2>
        </div>
        <Button onClick={loadAllFlags} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Status Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Type Filter and Toggle Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deck">Decks</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="comment">Comments</SelectItem>
              <SelectItem value="card">Cards</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showFlashyOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFlashyOnly(!showFlashyOnly)}
            className={showFlashyOnly ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
          >
            {showFlashyOnly ? "✨ Flashy Only" : "Show Flashy Only"}
          </Button>

          <Button
            variant={showEscalatedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowEscalatedOnly(!showEscalatedOnly)}
            className={showEscalatedOnly ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {showEscalatedOnly ? "🚨 Escalated Only" : "Show Escalated Only"}
          </Button>

          <Button
            variant={showMyTicketsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMyTicketsOnly(!showMyTicketsOnly)}
            className={showMyTicketsOnly ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
          >
            {showMyTicketsOnly ? "💼 My Tickets Only" : "Show My Tickets Only"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading flags...
        </div>
      ) : filteredFlags.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No flags found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentFlags.map((flag) => (
            <Card 
              key={flag.id} 
              className="p-4 cursor-pointer transition-all hover:border-emerald-500 hover:shadow-md dark:hover:border-emerald-400"
              onClick={() => setViewingTicketId(flag.id)}
            >
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(flag.status)}
                      {getTypeBadge(flag.targetType)}
                      <Badge variant="outline">{getReasonLabel(flag.reason)}</Badge>
                      {flag.isEscalated && (
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700">
                          <ArrowUpCircle className="w-3 h-3 mr-1" />Escalated
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {flag.targetType === 'comment' ? (
                          <>
                            Comment: {flag.targetDetails?.commentText ? (
                              <span className="text-gray-600 dark:text-gray-400 italic">
                                "{flag.targetDetails.commentText.length > 100 
                                  ? flag.targetDetails.commentText.substring(0, 100) + '...' 
                                  : flag.targetDetails.commentText}"
                              </span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">
                                {flag.targetName}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            Target: {flag.targetName}
                            {flag.targetDetails?.emoji && ` ${flag.targetDetails.emoji}`}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Reported by: {flag.reporterName}
                      </p>
                      {flag.targetUserName && flag.targetType !== 'user' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Content author: {flag.targetUserName}
                        </p>
                      )}
                      {flag.targetType === 'user' && flag.targetUserName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Reported user: {flag.targetUserName}
                        </p>
                      )}
                    </div>

                    {flag.notes && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Additional details:</p>
                        <p className="text-gray-700 dark:text-gray-300">{flag.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(flag.createdAt).toLocaleDateString()} {new Date(flag.createdAt).toLocaleTimeString()}
                      </span>
                      {flag.resolvedAt && (
                        <span>
                          Resolved: {new Date(flag.resolvedAt).toLocaleDateString()}
                        </span>
                      )}
                      {flag.status === 'reviewing' && flag.reviewingByName && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Reviewing: {flag.reviewingByName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-0 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewTarget(flag)
                      }}
                      className="w-full sm:w-32"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    {flag.status === 'reviewing' && flag.targetUserId && flag.targetType !== 'comment' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenWarningDialog(flag)
                        }}
                        className="w-full sm:w-32 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Warn User
                      </Button>
                    )}
                    {flag.status === 'reviewing' && flag.targetUserId && flag.targetType !== 'comment' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEscalationDialog(flag)
                        }}
                        disabled={flag.isEscalated}
                        className="w-full sm:w-32 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                        {flag.isEscalated ? 'Escalated' : 'Escalate'}
                      </Button>
                    )}
                    {flag.status !== 'resolved' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenResolutionDialog(flag)
                        }}
                        className="w-full sm:w-32 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                    {flag.status !== 'resolved' && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={flag.status}
                          onValueChange={(v) => handleStatusChange(flag.id, v as any)}
                        >
                          <SelectTrigger className="w-full sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="reviewing">Reviewing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {flag.status === 'resolved' && (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                        Resolved ✓
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Resolution Details */}
              {flag.status === 'resolved' && flag.resolutionReason && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Resolution Details</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-700 dark:text-blue-300">Reason:</span>
                      {getResolutionReasonBadge(flag.resolutionReason)}
                    </div>
                    {flag.resolvedByName && (
                      <div className="text-blue-700 dark:text-blue-300">
                        Resolved by: <span className="font-medium">{flag.resolvedByName}</span>
                      </div>
                    )}
                    {flag.moderatorNotes && (
                      <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Moderator Notes:</p>
                        <p className="text-blue-900 dark:text-blue-100">{flag.moderatorNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Escalation Details */}
              {flag.isEscalated && flag.escalationReason && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-900 dark:text-red-100">Escalation Details</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {flag.escalatedByName && (
                      <div className="text-red-700 dark:text-red-300">
                        Escalated by: <span className="font-medium">{flag.escalatedByName}</span>
                      </div>
                    )}
                    {flag.escalatedAt && (
                      <div className="text-red-700 dark:text-red-300">
                        Escalated on: {new Date(flag.escalatedAt).toLocaleDateString()} {new Date(flag.escalatedAt).toLocaleTimeString()}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                      <p className="text-xs text-red-600 dark:text-red-400 mb-1">Escalation Reason:</p>
                      <p className="text-red-900 dark:text-red-100">{flag.escalationReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredFlags.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2">
          <span>
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredFlags.length)} of {filteredFlags.length} flag{filteredFlags.length !== 1 ? 's' : ''}
          </span>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Resolution Dialog */}
      {selectedFlag && (
        <FlagResolutionDialog
          open={resolutionDialogOpen}
          onOpenChange={setResolutionDialogOpen}
          onResolve={handleResolveFlag}
          flagDetails={{
            targetType: selectedFlag.targetType,
            targetName: selectedFlag.targetName,
            reason: selectedFlag.reason,
            reporterNotes: selectedFlag.notes
          }}
        />
      )}
      
      {/* Warning Dialog */}
      {selectedFlag && (
        <UserWarningDialog
          open={warningDialogOpen}
          onOpenChange={setWarningDialogOpen}
          onSubmit={handleSubmitWarning}
          targetUserName={selectedFlag.targetUserName}
        />
      )}
      
      {/* Escalation Dialog */}
      {selectedFlag && (
        <FlagEscalationDialog
          open={escalationDialogOpen}
          onOpenChange={setEscalationDialogOpen}
          onEscalate={handleEscalateFlag}
          flagDetails={{
            targetType: selectedFlag.targetType,
            targetName: selectedFlag.targetName,
            reason: selectedFlag.reason,
            reporterNotes: selectedFlag.notes
          }}
        />
      )}
    </div>
  )
}