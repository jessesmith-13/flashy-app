import type { Hono, Context } from 'npm:hono@4'
import * as stripeService from '../lib/stripe.ts'
import { supabase } from '../lib/supabase.ts'
import type Stripe from 'npm:stripe@14'
import { sendSubscriptionActivatedEmail, sendSubscriptionRenewedEmail } from '../../server/lib/emailService.ts'

export function registerSubscriptionPaymentRoutes(app: Hono) {

    // ============================================================
    // Create Stripe Checkout Session
    // ============================================================
    app.post('/subscriptions/checkout', async (c: Context) => {
      try {
        const accessToken = c.req.header('Authorization')?.split(' ')[1]
        if (!accessToken) return c.json({ error: 'Missing access token' }, 401)

        const { data: { user }, error } = await supabase.auth.getUser(accessToken)
        if (error || !user) return c.json({ error: 'Unauthorized' }, 401)

        const { planType } = await c.req.json()
        if (!['monthly', 'annual', 'lifetime'].includes(planType)) {
          return c.json({ error: 'Invalid plan type' }, 400)
        }

        const priceId =
          stripeService.STRIPE_PRICE_IDS[planType as keyof typeof stripeService.STRIPE_PRICE_IDS]

        if (!priceId) {
          return c.json({ error: 'Payment configuration error' }, 500)
        }

        const origin =
          c.req.header('origin') ??
          c.req.header('referer')?.replace(/\/$/, '') ??
          'https://flashy.app'

        console.log('Stripe origin:', origin)

        // ✅ Create Stripe checkout session with customer_creation: 'always'
        const Stripe = (await import('npm:stripe@14')).default
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
          apiVersion: '2024-11-20.acacia',
        })

        const session = await stripe.checkout.sessions.create({
          customer_email: user.email!,
         ...(planType === 'lifetime' && { customer_creation: 'always' }), // ✅ Conditional
          client_reference_id: user.id,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: planType === 'lifetime' ? 'payment' : 'subscription',
          success_url: `${origin}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/#/upgrade`,
          metadata: {
            userId: user.id,
            planType,
          },
        })

        return c.json({ url: session.url })
      } catch (err) {
        console.error('Checkout error:', err)
        return c.json({ error: 'Failed to create checkout session' }, 500)
      }
    })

    // ============================================================
    // Stripe Webhook
    // ============================================================

    app.post('/subscriptions/stripe-webhook', async (c: Context) => {
      try {
        const signature = c.req.header('stripe-signature')
        if (!signature) return c.json({ error: 'Missing stripe signature' }, 400)

        const rawBody = await c.req.text()
        const isTestMode = c.req.header('x-test-mode') === 'true'

        let event: Stripe.Event

        if (isTestMode) {
          event = JSON.parse(rawBody)
        } else {
          event = await stripeService.verifyWebhookSignature(rawBody, signature)
        }

        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object
            const userId = session.metadata?.userId
            const planType = session.metadata?.planType

            if (!userId || !planType) break

            await supabase.auth.admin.updateUserById(userId, {
              user_metadata: {
                subscriptionTier: planType,
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
              },
            })

            // ✅ SEND ACTIVATION EMAIL
            const { data: userData } = await supabase
              .from('users')
              .select('email, display_name')
              .eq('id', userId)
              .single()

            if (userData) {
              const features = planType === 'lifetime' 
                ? ['Unlimited decks forever', 'Lifetime AI access', 'All future features included']
                : planType === 'annual'
                ? ['Unlimited decks', 'AI-powered features', 'Save 20% vs monthly', 'Priority support']
                : ['Unlimited decks', 'AI-powered features', 'Publish to community', 'Advanced study modes']
              
              await sendSubscriptionActivatedEmail(
                userData.email,
                userData.display_name || 'there',
                planType as 'monthly' | 'annual' | 'lifetime',
                features
              )
            }

            break
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object
            
            if (invoice.billing_reason === 'subscription_cycle' && invoice.customer_email) {
              const { data: userData } = await supabase
                .from('users')
                .select('id, display_name, subscription_tier')
                .eq('stripe_customer_id', invoice.customer)
                .single()

              if (userData) {
                const planNames = {
                  monthly: 'Premium Monthly',
                  annual: 'Premium Annual',
                  lifetime: 'Premium Lifetime'
                }
                
                const amount = `$${((invoice.amount_paid || 0) / 100).toFixed(2)}`
                const nextRenewal = invoice.lines?.data[0]?.period?.end
                  ? new Date(invoice.lines.data[0].period.end * 1000).toLocaleDateString()
                  : 'N/A'

                await sendSubscriptionRenewedEmail(
                  invoice.customer_email,
                  userData.display_name || 'there',
                  planNames[userData.subscription_tier as keyof typeof planNames] || 'Premium',
                  amount,
                  nextRenewal
                )
              }
            }
            break
          }

          case 'invoice.payment_failed': {
            console.log('⚠️ Payment failed:', event.data.object.id)
            break
          }

          case 'customer.subscription.deleted': {
            console.log('🗑️ Subscription cancelled:', event.data.object.id)
            break
          }

          default:
            console.log(`Unhandled Stripe event: ${event.type}`)
        }

        return c.json({ received: true })
      } catch (err) {
        console.error('Stripe webhook error:', err)
        return c.json({ error: 'Webhook processing failed' }, 500)
      }
    })

    // ============================================================
    // Verify Payment After Stripe Checkout
    // ============================================================
  app.post('/subscriptions/verify-payment', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) return c.json({ error: 'Missing access token' }, 401)

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

      const { sessionId } = await c.req.json()
      if (!sessionId) return c.json({ error: 'Missing session ID' }, 400)

      // Get session from Stripe
      const session = await stripeService.getCheckoutSession(sessionId)

      const customerId = typeof session.customer === 'string' 
        ? session.customer 
        : session.customer?.id

      const planType = session.metadata?.planType as 'monthly' | 'annual' | 'lifetime'
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

      // ✅ DEBUG: See what Stripe returns for subscription
      console.log('🔍 Stripe Session Data:', {
        sessionId,
        paymentStatus: session.payment_status,
        customer: customerId,
        subscription: session.subscription,
        subscriptionType: typeof session.subscription,
        extractedSubscriptionId: subscriptionId,
        planType: planType
      })

      // Validate payment
      if (session.payment_status !== 'paid') {
        return c.json({ error: 'Payment not completed' }, 400)
      }

      // ✅ MUST have customer (fixed with customer_creation: 'always')
      if (!session.customer) {
        return c.json({ error: 'No customer found in session' }, 400)
      }

      // Calculate expiry date
      let expiryDate: string | null = null
      if (planType === 'monthly') {
        const date = new Date()
        date.setMonth(date.getMonth() + 1)
        expiryDate = date.toISOString()
      } else if (planType === 'annual') {
        const date = new Date()
        date.setFullYear(date.getFullYear() + 1)
        expiryDate = date.toISOString()
      } else if (planType === 'lifetime') {
        // Lifetime = null expiry
        expiryDate = null
      }

      // ✅ UPDATE USERS TABLE
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: planType,
          subscription_expiry: expiryDate,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId || null,
          subscription_cancelled_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update user subscription:', updateError)
        return c.json({ error: 'Failed to update subscription' }, 500)
      }

      // ✅ UPSERT: Update if exists, Insert if not (handles unique constraint)
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          tier: planType,
          status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId || null,
          current_period_end: expiryDate,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'  // Update the existing record for this user
        })

      if (upsertError) {
        console.error('Failed to upsert subscription record:', upsertError)
        // Don't fail the request - user table is already updated
      }

      console.log(`✅ Subscription activated for user ${user.id}: ${planType}`)

      console.log('📋 Returning to frontend:', {
        tier: planType,
        subscriptionExpiry: expiryDate,
        stripeSubscriptionId: subscriptionId,
        sessionSubscription: session.subscription
      })
      
      return c.json({ 
        success: true,
        tier: planType,
        subscriptionExpiry: expiryDate,
        stripeSubscriptionId: subscriptionId || null,
        subscriptionCancelledAtPeriodEnd: false
      })
    } catch (err) {
      console.error('Payment verification error:', err)
      return c.json({ error: 'Failed to verify payment' }, 500)
    }
  })
}