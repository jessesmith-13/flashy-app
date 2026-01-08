export type FlagTargetType = 'deck' | 'user' | 'comment' | 'card'

export type FlagReason =
  | 'inappropriate'
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'copyright'
  | 'other'

export type FlagStatus =
  | 'open'
  | 'reviewing'
  | 'resolved'

export type FlagSeverity = 'low' | 'medium' | 'high'

export type CreateFlagPayload = {
  targetType: FlagTargetType
  targetId: string
  reason: FlagReason
  description?: string          // maps to `description`
  severity?: FlagSeverity       // maps to `severity`

  /** Context snapshot (stored as text/jsonb on backend if needed) */
  targetContent?: string        // maps to `target_content`

  /** For faster moderation views */
  targetOwnerId?: string        // maps to `target_owner_id`
  targetOwnerName?: string      // maps to `target_owner_name`
  notes: string
}