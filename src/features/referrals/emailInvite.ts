/**
 * Frontend utility for sending referral invitation emails
 * 
 * Note: The actual email is sent from the backend via the email service.
 * This utility makes it easy to trigger invitation emails from the frontend.
 */

interface SendReferralInviteParams {
  toEmail: string
  fromName: string
  referralLink: string
  accessToken: string
}

/**
 * Send a referral invitation email to a friend
 * 
 * This calls the backend endpoint which uses the email service to send
 * a nicely formatted invitation email with the referral link.
 */
export async function sendReferralInviteEmail({
  toEmail,
  fromName,
  referralLink,
  accessToken,
}: SendReferralInviteParams): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/referrals/send-invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          toEmail,
          fromName,
          referralLink,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Failed to send referral invite:', data.error)
      return {
        success: false,
        error: data.error || 'Failed to send invitation email',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending referral invite:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitation email',
    }
  }
}

/**
 * Share referral link via native share or copy to clipboard
 * 
 * This is an alternative to email that uses the native share API
 * or falls back to copying to clipboard.
 */
export async function shareReferralLink(
  referralLink: string,
  userName: string
): Promise<{ success: boolean; method: 'shared' | 'copied' | 'none' }> {
  const shareData = {
    title: 'Join me on Flashy!',
    text: `${userName} invited you to Flashy - Get 1 month of Premium free! 🎁`,
    url: referralLink,
  }

  // Try native share API first (works on mobile)
  if (navigator.share) {
    try {
      await navigator.share(shareData)
      return { success: true, method: 'shared' }
    } catch (error) {
      // User cancelled the share
      if ((error as Error).name === 'AbortError') {
        return { success: false, method: 'none' }
      }
    }
  }

  // Fallback to copying to clipboard
  try {
    await navigator.clipboard.writeText(referralLink)
    return { success: true, method: 'copied' }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return { success: false, method: 'none' }
  }
}
