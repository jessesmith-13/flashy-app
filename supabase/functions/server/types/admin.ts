import { AuthUser } from './auth.ts'

export type GuardResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: Response }

export type AdminActivityItem = {
  id: string
  type:
    | 'flag_submitted'
    | 'flag_received'
    | 'content_deleted'
    | 'moderation_action'
    | 'account_action'
  timestamp: string
  userId: string
  userName: string
  details: Record<string, unknown>
}