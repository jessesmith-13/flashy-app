import { useState, useEffect, useMemo } from 'react'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Card } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { AlertTriangle, CheckCircle, Clock, Eye, Flag, ExternalLink, ChevronLeft, ChevronRight, ArrowUpCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs'
import { useNavigation } from '../../../hooks/useNavigation'
import { useStore } from '../../../store/useStore'
import { TicketDetailView } from './TicketDetailView'
import { UserWarningDialog } from './UserWarningDialog'
import { FlagEscalationDialog } from './FlagEscalationDialog'
import { FlagResolutionDialog } from './FlagResolutionDialog'
import * as api from '../../../utils/api/moderation'

interface TicketData {
  id: string
  title: string | null
  category: string
  priority: string
  status: string
  description: string
  targetType: string | null
  targetId: string | null
  assignedTo: string | null
  assignedToId: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  resolvedById: string | null
  resolutionNote: string | null
  resolutionReason: string | null
  relatedFlagId: string | null
  createdAt: string
  updatedAt: string
  relatedUserId?: string | null
  relatedDeckId?: string | null
  relatedDeckTitle?: string | null
  relatedCardId?: string | null
  relatedCardTitle?: string | null
  relatedCommentId?: string | null
  relatedCommentText?: string | null
  isEscalated?: boolean | null
  escalatedAt?: string | null
  escalatedById?: string | null
  escalatedByDisplayName?: string | null
  escalatedReason?: string | null
  relatedUserDisplayName?: string | null
  createdBy?: string | null
  createdByDisplayName?: string | null
  flagReason?: string | null
  flagAdditionalDetails?: string | null
  flaggedUserDisplayName?: string | null
}

export function TicketManagementPanel() {
  const [allTickets, setAllTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'open' | 'reviewing' | 'resolved' | 'all'>('open')
  const [typeFilter, setTypeFilter] = useState<'all' | 'deck' | 'user' | 'comment' | 'card'>('all')
  const [showFlashyOnly, setShowFlashyOnly] = useState(false)
  const [showEscalatedOnly, setShowEscalatedOnly] = useState(false)
  const [showMyTicketsOnly, setShowMyTicketsOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Dialog states
  const [warnDialogOpen, setWarnDialogOpen] = useState(false)
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false)
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  
  const { navigateTo } = useNavigation()
  const { setViewingCommunityDeckId, setViewingUserId, setTargetCardIndex, user, viewingTicketId, setViewingTicketId, accessToken } = useStore()

  useEffect(() => {
    loadAllTickets()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, typeFilter, showMyTicketsOnly])

  const getTargetType = (ticket: TicketData): string | null => {
    if (ticket.targetType) return ticket.targetType
    if (ticket.relatedUserId) return 'user'
    if (ticket.relatedDeckId) return 'deck'
    if (ticket.relatedCardId) return 'card'
    if (ticket.relatedCommentId) return 'comment'

    return null
  }

  const getTargetId = (ticket: TicketData): string | null => {
    if (ticket.targetId) return ticket.targetId
    if (ticket.relatedUserId) return ticket.relatedUserId
    if (ticket.relatedDeckId) return ticket.relatedDeckId
    if (ticket.relatedCardId) return ticket.relatedCardId
    if (ticket.relatedCommentId) return ticket.relatedCommentId
    return null
  }

  const getTargetTitle = (ticket: TicketData): string | null => {
      if (ticket.relatedUserDisplayName) return ticket.relatedUserDisplayName
      if (ticket.relatedDeckTitle) return ticket.relatedDeckTitle
      if (ticket.relatedCardTitle) return ticket.relatedCardTitle
      if (ticket.relatedCommentText) return ticket.relatedCommentText
      return null
  }

  const filteredTickets = useMemo(() => {
    let filtered = allTickets

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const ticketType = getTargetType(ticket)
        return ticketType === typeFilter
      })
    }

    if (showFlashyOnly) {
      filtered = filtered.filter(ticket => ticket.flaggedUserDisplayName?.toLowerCase() === 'flashy')
    }

    if (showEscalatedOnly) {
      filtered = filtered.filter(ticket => ticket.isEscalated === true)
    }

    if (showMyTicketsOnly && user) {
      filtered = filtered.filter(ticket => {
        return ticket.assignedToId === user.id
      })
    }

    return filtered
  }, [allTickets, statusFilter, typeFilter, showFlashyOnly, showEscalatedOnly, showMyTicketsOnly, user])

  const loadAllTickets = async () => {
    if (!accessToken) return
    
    setLoading(true)
    try {
      const data = await api.getTickets(accessToken)
      console.log('✅ Fetched tickets:', data.tickets)
      setAllTickets(data.tickets || [])
    } catch (error: any) {
      console.error('❌ Failed to load tickets:', error)
      toast.error(error.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
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
      return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0"><AlertTriangle className="w-3 h-3 mr-1" />Open</Badge>
    }
    if (status === 'reviewing') {
      return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0"><Eye className="w-3 h-3 mr-1" />Reviewing</Badge>
    }
    if (status === 'resolved') {
      return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>
    }
    if (status === 'dismissed') {
      return <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-0"><CheckCircle className="w-3 h-3 mr-1" />Dismissed</Badge>
    }
    return null
  }

  const getTypeBadge = (type: string | null) => {
    if (!type) return null
    const colors: Record<string, string> = {
      deck: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      user: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      comment: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      card: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    }
    return <Badge className={`${colors[type] || 'bg-gray-100'} border-0`}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>
  }

  const handleViewTarget = (e: React.MouseEvent, ticket: TicketData) => {
    e.stopPropagation()
    const targetType = getTargetType(ticket)
    const targetId = getTargetId(ticket)
    
    if (!targetType || !targetId) {
      toast.error('Cannot navigate - missing target information')
      return
    }
    
    switch (targetType) {
      case 'deck':
        setViewingCommunityDeckId(targetId)
        setTargetCardIndex(null)
        navigateTo('community')
        toast.info(`Viewing flagged deck`)
        break
      case 'user':
        setViewingUserId(targetId)
        navigateTo('community')
        break
      case 'comment':
        toast.error('Comment navigation requires deck context')
        break
      case 'card':
        toast.error('Card navigation requires deck context')
        break
      default:
        toast.error('Unknown target type')
    }
  }

  const handleChangeStatus = async (e: React.MouseEvent, ticketId: string, newStatus: string) => {
    e.stopPropagation()
    if (!accessToken) return
    
    try {
      await api.updateTicketStatus(accessToken, ticketId, {
        status: newStatus as any,
        resolutionNote: newStatus === 'resolved' ? 'Resolved from ticket list' : undefined,
        resolutionReason: newStatus === 'resolved' ? 'approved' : 'rejected'
      })

      toast.success(`Status changed to ${newStatus}`)
      loadAllTickets()
    } catch (error: any) {
      console.error('❌ Failed to change status:', error)
      toast.error(error.message || 'Failed to change status')
    }
  }

  const handleWarnUser = (e: React.MouseEvent, ticket: TicketData) => {
    e.stopPropagation()
    setSelectedTicket(ticket)
    setWarnDialogOpen(true)
  }

  const handleEscalate = (e: React.MouseEvent, ticket: TicketData) => {
    e.stopPropagation()
    setSelectedTicket(ticket)
    setEscalateDialogOpen(true)
  }

  const handleResolve = (e: React.MouseEvent, ticket: TicketData) => {
    e.stopPropagation()
    setSelectedTicket(ticket)
    setResolutionDialogOpen(true)
  }

  const handleWarnSubmit = async (warning: {
    reason: string
    customReason?: string
    message?: string
    timeToResolve: string
    customTime?: string
  }) => {
    if (!accessToken || !selectedTicket) return
    
    try {
      await api.warnUser(accessToken, selectedTicket.id, warning)
      toast.success('Warning sent to user')
      setWarnDialogOpen(false)
      loadAllTickets()
    } catch (error: any) {
      console.error('❌ Failed to warn user:', error)
      toast.error(error.message || 'Failed to warn user')
      throw error
    }
  }

  const handleEscalateSubmit = async (reason: string) => {
    if (!accessToken || !selectedTicket) return
    
    try {
      await api.escalateTicket(accessToken, selectedTicket.id, reason)
      toast.success('Ticket escalated to admin')
      setEscalateDialogOpen(false)
      loadAllTickets()
    } catch (error: any) {
      console.error('❌ Failed to escalate ticket:', error)
      toast.error(error.message || 'Failed to escalate ticket')
      throw error
    }
  }

  const handleResolveSubmit = async (resolutionReason: 'approved' | 'rejected' | 'removed', moderatorNotes: string) => {
    if (!accessToken || !selectedTicket) return
    
    try {
      await api.updateTicketStatus(accessToken, selectedTicket.id, {
        status: 'resolved',
        resolutionNote: moderatorNotes || 'Resolved',
        resolutionReason: resolutionReason
      })

      toast.success('Ticket resolved')
      setResolutionDialogOpen(false)
      loadAllTickets()
    } catch (error: any) {
      console.error('❌ Failed to resolve ticket:', error)
      toast.error(error.message || 'Failed to resolve ticket')
    }
  }

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  // If viewing a ticket, render the TicketDetailView
  if (viewingTicketId) {
    return (
      <TicketDetailView 
        ticketId={viewingTicketId} 
        onBack={() => {
          setViewingTicketId(null)
          loadAllTickets()
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
        <Button onClick={loadAllTickets} variant="outline" size="sm">
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
          Loading tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentTickets.map((ticket) => {
            const targetType = getTargetType(ticket)
            const targetId = getTargetId(ticket)
            const isReviewing = ticket.status === 'reviewing'
            
            return (
            <Card 
              key={ticket.id} 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isReviewing 
                  ? 'border-2 border-teal-400 dark:border-teal-500 hover:border-teal-500 dark:hover:border-teal-400' 
                  : 'hover:border-emerald-500 dark:hover:border-emerald-400'
              }`}
              onClick={() => setViewingTicketId(ticket.id)}
            >
              <div className="flex gap-4">
                {/* LEFT SIDE - Content */}
                <div className="flex-1 space-y-3">
                  {/* Three badges in a row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(ticket.status)}
                    {targetType && getTypeBadge(targetType)}
                    {ticket.title && (
                      <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {getReasonLabel(ticket.title)}
                      </Badge>
                    )}
                    {(ticket.isEscalated === true) && (
                      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 border">
                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                        Escalated
                      </Badge>
                    )}
                  </div>

                  {/* Target info */}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Target: {getTargetTitle(ticket)|| 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Reported by: {ticket.createdByDisplayName || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Content author: {ticket.flaggedUserDisplayName || 'Unknown'}
                    </p>

                  </div>

                  {/* Additional details */}
                  {ticket.description && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Additional details:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{ticket.description}</p>
                    </div>
                  )}

                  {/* Timestamp and reviewing indicator */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {isReviewing && ticket.assignedTo && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Reviewing: {ticket.assignedTo}
                      </span>
                    )}
                  </div>

                  {/* Escalation Details - Show for escalated tickets */}
                  {ticket.isEscalated && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-1.5 border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-900 dark:text-red-100">
                          Escalation Details
                        </span>
                      </div>
                      {ticket.escalatedByDisplayName && (
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">Escalated by:</span> {ticket.escalatedByDisplayName}
                        </div>
                      )}
                      {ticket.escalatedAt && (
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">Escalated on:</span> {new Date(ticket.escalatedAt).toLocaleDateString()} {new Date(ticket.escalatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {ticket.escalatedReason && (
                        <div className="pt-1 border-t border-red-200 dark:border-red-800 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Reason:</span>
                          <p className="text-xs text-gray-900 dark:text-gray-100 mt-1">{ticket.escalatedReason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolution Details - Show for resolved/dismissed tickets */}
                  {(ticket.status === 'resolved' || ticket.status === 'dismissed') && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-1.5 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Resolution Details
                        </span>
                      </div>
                      {ticket.resolutionReason && (
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">Reason:</span>{' '}
                          <span className="capitalize">
                            {ticket.resolutionReason === 'rejected' && '❌ Rejected - Not a valid report'}
                            {ticket.resolutionReason === 'approved' && '✅ Approved - Flag is valid'}
                            {ticket.resolutionReason === 'removed' && '🗑️ Removed - Content deleted'}
                          </span>
                        </div>
                      )}
                      {ticket.resolvedBy && (
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">Resolved by:</span> {ticket.resolvedBy}
                        </div>
                      )}
                      {ticket.resolvedAt && (
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">Resolved on:</span> {new Date(ticket.resolvedAt).toLocaleDateString()} {new Date(ticket.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {ticket.resolutionNote && (
                        <div className="pt-1 border-t border-blue-200 dark:border-blue-800 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Moderator Notes:</span>
                          <p className="text-xs text-gray-900 dark:text-gray-100 mt-1">{ticket.resolutionNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT SIDE - Action buttons stacked vertically */}
                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                  {/* View button */}
                  {targetId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleViewTarget(e, ticket)}
                      className="w-full flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Button>
                  )}

                  {/* Action buttons - only show if reviewing */}
                  {isReviewing && (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => handleWarnUser(e, ticket)}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Warn User
                      </Button>

                      <Button
                        size="sm"
                        onClick={(e) => ticket.isEscalated ? e.stopPropagation() : handleEscalate(e, ticket)}
                        disabled={ticket.isEscalated}
                        className={`w-full flex items-center justify-center gap-1 ${
                          ticket.isEscalated 
                            ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-white' 
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        <ArrowUpCircle className="w-3 h-3" />
                        {ticket.isEscalated ? 'Escalated' : 'Escalate'}
                      </Button>
                    </>
                  )}

                  {/* Resolve button - always show for non-resolved tickets */}
                  {ticket.status !== 'resolved' && ticket.status !== 'dismissed' && (
                    <Button
                      size="sm"
                      onClick={(e) => handleResolve(e, ticket)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Resolve
                    </Button>
                  )}

                  {/* Status dropdown - always show for non-resolved tickets */}
                  {ticket.status !== 'resolved' && ticket.status !== 'dismissed' && (
                    <Select 
                      value={ticket.status} 
                      onValueChange={(newStatus) => {
                        const event = new MouseEvent('click') as any
                        handleChangeStatus(event, ticket.id, newStatus)
                      }}
                    >
                      <SelectTrigger 
                        className="w-full h-9" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="reviewing">Reviewing</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTickets.length)} of {filteredTickets.length} tickets
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      {selectedTicket && (
        <>
          <UserWarningDialog
            open={warnDialogOpen}
            onOpenChange={setWarnDialogOpen}
            onSubmit={handleWarnSubmit}
            targetUserName={selectedTicket.relatedUserDisplayName || undefined}
            flagDetails={
              selectedTicket
                ? {
                    targetType: getTargetType(selectedTicket) || 'unknown',
                    targetName: selectedTicket.title || selectedTicket.description || 'Unknown',
                    reason: selectedTicket.flagReason || selectedTicket.category,
                    reporterNotes: selectedTicket.flagAdditionalDetails || selectedTicket.description || '',
                  }
                : undefined
            }
          />

          <FlagEscalationDialog
            open={escalateDialogOpen}
            onOpenChange={setEscalateDialogOpen}
            onEscalate={handleEscalateSubmit}
            flagDetails={
              selectedTicket
                ? {
                    targetType: getTargetType(selectedTicket) || 'unknown',
                    targetName: selectedTicket.title || selectedTicket.description || 'Unknown',
                    reason: selectedTicket.flagReason || selectedTicket.category,
                    reporterNotes: selectedTicket.flagAdditionalDetails || selectedTicket.description,
                  }
                : undefined
            }
          />

          <FlagResolutionDialog
            open={resolutionDialogOpen}
            onOpenChange={setResolutionDialogOpen}
            onResolve={handleResolveSubmit}
            flagDetails={
              selectedTicket
                ? {
                    targetType: getTargetType(selectedTicket) || 'unknown',
                    targetName: selectedTicket.title || selectedTicket.description || 'Unknown',
                    reason: selectedTicket.flagReason || selectedTicket.category,
                    reporterNotes: selectedTicket.flagAdditionalDetails || selectedTicket.description,
                  }
                : undefined
            }
          />
        </>
      )}
    </div>
  )
}