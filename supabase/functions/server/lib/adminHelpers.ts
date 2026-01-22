import { supabase } from './supabase.ts'
import type { AdminActivityItem } from '../types/admin.ts'
import type { User } from '../types/users.ts'

export async function buildUserActivity(
  targetUser: User
): Promise<AdminActivityItem[]> {

  const activity: AdminActivityItem[] = []

  const userId = targetUser.id
  const userName = targetUser.display_name ?? 'Unknown User'

  // --------------------------------------------------
  // Flags submitted BY user
  // --------------------------------------------------
  const { data: flagsByUser } = await supabase
    .from('flags')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false })

  for (const flag of flagsByUser ?? []) {
    activity.push({
      id: flag.id,
      type: 'flag_submitted',
      timestamp: flag.created_at,
      userId,
      userName,
      details: {
        targetType: flag.target_type,
        targetId: flag.target_id,
        reason: flag.reason,
        status: flag.status,
      },
    })
  }

  // --------------------------------------------------
  // Account actions (ban history)
  // --------------------------------------------------
  if (targetUser.is_banned && targetUser.banned_at) {
    activity.push({
      id: `ban-${userId}`,
      type: 'account_action',
      timestamp: targetUser.banned_at,
      userId,
      userName,
      details: {
        action: 'banned',
        reason: targetUser.banned_reason,
        bannedBy: targetUser.banned_by,
      },
    })
  }

  // --------------------------------------------------
  // Sort newest first
  // --------------------------------------------------
  activity.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return activity
}