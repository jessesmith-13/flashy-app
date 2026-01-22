// ============================================================
// MODERATION TYPES - Based on Actual Database Schema
// ============================================================

/**
 * Flag - Content report created by users
 * Table: flags
 */
export interface Flag {
  id: string // uuid
  reporter_id: string // uuid
  reporter_name: string | null // text
  reporter_avatar: string | null // text
  target_type: string // text
  target_id: string // uuid
  target_content: string | null // text
  target_owner_id: string | null // uuid
  target_owner_name: string | null // text
  reason: string // text
  description: string | null // text
  severity: string | null // text
  status: string | null // text
  created_at: string // timestamptz
  updated_at: string | null // timestamptz
  resolved_at: string | null // timestamptz
  resolution_note: string | null // text
  resolved_by: string | null // uuid
  resolved_by_name: string | null // text
  reviewing_by: string | null // uuid
  reviewing_by_name: string | null // text
  is_escalated: boolean | null // boolean
  escalated_by: string | null // uuid
  escalated_by_name: string | null // text
  escalated_at: string | null // timestamptz
}

/**
 * ModerationAction - Actions taken by moderators
 * Table: moderation_actions
 */
export interface ModerationAction {
  id: string // uuid
  moderator_id: string // uuid
  moderator_name: string | null // text
  action_type: string // text
  target_type: string // text
  target_id: string // uuid
  reason: string | null // text
  additional_details: string | null // text
  metadata: Record<string, unknown> | null // jsonb
  created_at: string // timestamptz
}

/**
 * TicketAction - Action history for tickets
 * Table: ticket_actions
 */
export interface TicketAction {
  id: string // uuid
  ticket_id: string // uuid
  action_type: string // text
  performed_by: string | null // text
  performed_by_id: string | null // uuid
  timestamp: string // timestamptz
  details: Record<string, unknown> | null // jsonb
}

/**
 * Ticket - Moderation ticket for tracking issues
 * Table: tickets
 */
export interface Ticket {
  id: string // uuid
  title: string // text
  description: string | null // text
  category: string | null // text
  priority: string | null // text
  status: string | null // text
  created_by: string // uuid
  assigned_to: string | null // uuid
  related_flag_id: string | null // uuid
  related_user_id: string | null // uuid
  related_deck_id: string | null // uuid
  resolution_note: string | null // text
  resolved_at: string | null // timestamptz
  created_at: string // timestamptz
  updated_at: string | null // timestamptz
}

/**
 * TicketComment - Comments on tickets
 * Table: ticket_comments
 */
export interface TicketComment {
  id: string // text (not uuid!)
  ticket_id: string // uuid
  user_id: string // uuid
  user_name: string | null // text
  content: string // text
  mentions: Record<string, unknown> | null // jsonb
  created_at: string // timestamptz
}

// ============================================================
// TYPED ENUMS (based on code usage)
// ============================================================

export type FlagTargetType = 'deck' | 'user' | 'comment' | 'card'
export type FlagReason = 'inappropriate' | 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other'
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical'
export type FlagStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

export type ModerationActionType = 'issue_warning' | 'ban_user' | 'delete_content' | 'restore_content' | 'feature_content' | 'other'
export type ModerationTargetType = 'user' | 'deck' | 'card' | 'comment'

export type TicketCategory = 'content_violation' | 'user_report' | 'bug_report' | 'feature_request' | 'general' | 'technical_issue'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated'

export type TicketActionType = 'creation' | 'assignment' | 'status_change' | 'comment' | 'resolution' | 'escalation' | 'priority_change'

// ============================================================
// CAMELCASE RESPONSE TYPES (for API responses)
// ============================================================

export interface FlagResponse {
  id: string
  reporterId: string
  reporterName: string | null
  reporterAvatar: string | null
  targetType: string
  targetId: string
  targetContent: string | null
  targetOwnerId: string | null
  targetOwnerName: string | null
  reason: string
  description: string | null
  severity: string | null
  status: string | null
  createdAt: string
  updatedAt: string | null
  resolvedAt: string | null
  resolutionNote: string | null
  resolvedBy: string | null
  resolvedByName: string | null
  reviewingBy: string | null
  reviewingByName: string | null
  isEscalated: boolean | null
  escalatedBy: string | null
  escalatedByName: string | null
  escalatedAt: string | null
}

export interface ModerationActionResponse {
  id: string
  moderatorId: string
  moderatorName: string | null
  actionType: string
  targetType: string
  targetId: string
  reason: string | null
  additionalDetails: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface TicketActionResponse {
  id: string
  ticketId: string
  actionType: string
  performedBy: string | null
  performedById: string | null
  timestamp: string
  details: Record<string, unknown> | null
}

export interface TicketResponse {
  id: string
  title: string
  description: string | null
  category: string | null
  priority: string | null
  status: string | null
  createdBy: string
  assignedTo: string | null
  relatedFlagId: string | null
  relatedUserId: string | null
  relatedDeckId: string | null
  resolutionNote: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface TicketCommentResponse {
  id: string
  ticketId: string
  userId: string
  userName: string | null
  content: string
  mentions: Record<string, unknown> | null
  createdAt: string
}

// ============================================================
// REQUEST TYPES
// ============================================================

export interface CreateFlagRequest {
  targetType: FlagTargetType
  targetId: string
  reason: FlagReason
  notes?: string
  targetDetails?: {
    front?: string
    name?: string
    text?: string
    deckId?: string
  }
}

export interface UpdateFlagRequest {
  status?: FlagStatus
  resolutionNote?: string
  moderatorNotes?: string
}

export interface CreateTicketCommentRequest {
  content: string
  mentions?: string[]
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus
  resolutionNote?: string
}

export interface AssignTicketRequest {
  moderatorId: string
}

export interface CreateWarningRequest {
  userId: string
  flagId?: string
  reason: string
  customReason?: string
  message?: string
  timeToResolve: string | number
  targetType: string
  targetId: string
  targetName: string
}

// ============================================================
// METADATA/DETAILS TYPE HELPERS
// ============================================================

/**
 * Warning metadata stored in moderation_actions.metadata
 */
export interface WarningMetadata {
  status: 'active' | 'resolved' | 'expired'
  time_to_resolve: number
  deadline: string
  resolved_at: string | null
  content_target_type: string
  content_target_id: string
  content_target_name: string
  flag_id?: string
}

/**
 * Ticket action details stored in ticket_actions.details
 */
export interface TicketActionDetails {
  oldStatus?: string
  newStatus?: string
  oldPriority?: string
  newPriority?: string
  assignedTo?: string
  assignedToId?: string
  resolutionNotes?: string
  escalatedTo?: string
}

/**
 * Flag action details stored in similar actions
 */
export interface FlagActionDetails {
  oldStatus?: string
  newStatus?: string
  assignedTo?: string
  assignedToId?: string
  previouslyAssignedTo?: string
  resolutionReason?: string
  escalatedBy?: string
  escalatedById?: string
}

export type DeleteRequestBody = {
  reason: string
  additionalDetails?: string
}

export type DeletedComment = {
  kind: 'comment'
  user_id: string
  user_name: string
  content: string
}

export type DeletedReply = {
  kind: 'reply'
  user_id: string
  user_name: string
  content: string
  comment_id: string
}

export type DeletedItem = DeletedComment | DeletedReply
