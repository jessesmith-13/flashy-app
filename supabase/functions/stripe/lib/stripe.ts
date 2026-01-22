import Stripe from 'npm:stripe@14'

// Initialize Stripe with secret key from environment
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

// Price IDs for each subscription tier (you'll need to create these in Stripe Dashboard)
export const STRIPE_PRICE_IDS = {
  monthly: Deno.env.get('STRIPE_PRICE_ID_MONTHLY') || 'price_monthly',
  annual: Deno.env.get('STRIPE_PRICE_ID_ANNUAL') || 'price_annual',
  lifetime: Deno.env.get('STRIPE_PRICE_ID_LIFETIME') || 'price_lifetime',
}

export interface CheckoutSessionParams {
  priceId: string
  userId: string
  userEmail: string
  planType: 'monthly' | 'annual' | 'lifetime'
  successUrl: string
  cancelUrl: string
}

export const getCheckoutSession = async (sessionId: string) => {
  console.log('🔍 Received sessionId:', sessionId)
  
  try {
    console.log('🔑 Using Stripe key starting with: ...')
    const session = await stripe.checkout.sessions.retrieve(sessionId)  // ← SAME LINE!
    console.log('✅ Session retrieved!')
    return session  // ← RETURNS THE SAME THING!
  } catch (error) {
    console.error('❌ ERROR:', error)  // ← NOW WE SEE THE ERROR!
    throw error
  }
}

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const { priceId, userId, userEmail, planType, successUrl, cancelUrl } = params

  const isLifetime = planType === 'lifetime'

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer_email: userEmail,
    client_reference_id: userId,

    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],

    mode: isLifetime ? 'payment' : 'subscription',

    success_url: successUrl,
    cancel_url: cancelUrl,

    // ✅ ALWAYS attach metadata to the session
    metadata: {
      userId,
      planType,
    },

    // ✅ CRITICAL: propagate metadata to the subscription
    ...(isLifetime
      ? {}
      : {
          subscription_data: {
            metadata: {
              userId,
              planType,
            },
          },
        }),
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
): Promise<Stripe.Event> {
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
  
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId)
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId)
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export async function updateSubscriptionPrice(
  subscriptionId: string,
  newPriceId: string,
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice',
    cancel_at_period_end: false,
  })
}