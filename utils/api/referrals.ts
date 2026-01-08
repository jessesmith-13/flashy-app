import { API_BASE } from '../../src/supabase/runtime'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY


/**
 * ============================================================
 * REFERRALS API
 * ============================================================
 */

/**
 * Send a referral invite email
 */
export const sendReferralInvite = async (
  accessToken: string,
  email: string
): Promise<{
  message: string
  referralCode: string
  referralLink: string
  note: string
}> => {
  const response = await fetch(`${API_BASE}/referrals/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ email }),
  })

  const data: {
    message?: string
    referralCode?: string
    referralLink?: string
    note?: string
    error?: string
  } = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send referral invite')
  }

  return {
    message: data.message!,
    referralCode: data.referralCode!,
    referralLink: data.referralLink!,
    note: data.note!,
  }
}

/**
 * Get referral statistics for the current user
 */
export const getReferralStats = async (
  accessToken: string
): Promise<{
  totalInvites: number
  completedReferrals: number
  pendingReferrals: number
  invites: unknown[]
}> => {
  const response = await fetch(`${API_BASE}/referrals/stats`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data: {
    totalInvites?: number
    completedReferrals?: number
    pendingReferrals?: number
    invites?: unknown[]
    error?: string
  } = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get referral stats')
  }

  return {
    totalInvites: data.totalInvites ?? 0,
    completedReferrals: data.completedReferrals ?? 0,
    pendingReferrals: data.pendingReferrals ?? 0,
    invites: data.invites ?? [],
  }
}

/**
 * Apply a referral code for a newly created user
 *
 * NOTE:
 * Uses anon key by design (new users may not be authenticated yet)
 */
export const applyReferralCode = async (
  referralCode: string,
  newUserId: string
): Promise<{
  success: boolean
  message: string
}> => {
  const response = await fetch(`${API_BASE}/referrals/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ referralCode, newUserId }),
  })

  const data: {
    success?: boolean
    message?: string
    error?: string
  } = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to apply referral code')
  }

  return {
    success: data.success ?? false,
    message: data.message ?? '',
  }
}