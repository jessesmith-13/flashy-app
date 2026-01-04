import { STRIPE_API_BASE } from '../supabase/info'

/**
 * ============================================================
 * SUBSCRIPTIONS API
 * ============================================================
 */

/**
 * Create Stripe Checkout Session
 */
export const createCheckoutSession = async (
  accessToken: string,
  planType: 'monthly' | 'annual' | 'lifetime'
): Promise<string> => {
  const response = await fetch(`${STRIPE_API_BASE}/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ planType }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to create checkout session:', data.error)
    throw new Error(data.error || 'Failed to create checkout session')
  }

  return data.url
}

/**
 * Verify Stripe payment (fallback if webhook fails)
 */
export const verifyPayment = async (
  accessToken: string,
  sessionId: string
) => {
  const response = await fetch(`${STRIPE_API_BASE}/subscriptions/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ sessionId }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to verify payment:', data.error)
    throw new Error(data.error || 'Failed to verify payment')
  }

  return data
}

/**
 * Create Stripe Customer Portal Session
 */
export const createPortalSession = async (
  accessToken: string
): Promise<string> => {
  const response = await fetch(
    `${STRIPE_API_BASE}/subscriptions/create-portal-session`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to create portal session:', data.error)
    throw new Error(data.error || 'Failed to create portal session')
  }

  return data.url
}

/**
 * Cancel active subscription
 */
export const cancelSubscription = async (accessToken: string) => {
  const response = await fetch(
    `${STRIPE_API_BASE}/subscriptions/cancel-subscription`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to cancel subscription:', data.error)
    throw new Error(data.error || 'Failed to cancel subscription')
  }

  return data
}

/**
 * Change subscription plan
 */
export const changeSubscriptionPlan = async (
  accessToken: string,
  newPlan: 'monthly' | 'annual' | 'lifetime'
) => {
  const response = await fetch(
    `${STRIPE_API_BASE}/subscriptions/change-subscription-plan`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ newPlan }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to change subscription plan:', data.error)
    throw new Error(data.error || 'Failed to change subscription plan')
  }

  return data
}