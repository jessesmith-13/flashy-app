import { useEffect } from 'react'
import { useNavigation } from '../../hooks/useNavigation'
import { Button } from '../ui/button'
import { Check, Sparkles } from 'lucide-react'
import { AppLayout } from './Layout/AppLayout'
import { useStore } from '../../store/useStore'
import { supabaseClient, verifyPayment } from '../../utils/api'

export function PaymentSuccessScreen() {
  const { navigateTo } = useNavigation()
  const { setAuth, accessToken, user } = useStore()

  useEffect(() => {
    console.log('=== PaymentSuccessScreen mounted ===')
    console.log('Current URL:', window.location.href)
    console.log('User:', user)
    console.log('Access Token:', accessToken ? 'Present' : 'Missing')
    
    // Get session ID from URL hash (since we're using HashRouter)
    const hash = window.location.hash
    const queryString = hash.includes('?') ? hash.split('?')[1] : ''
    const urlParams = new URLSearchParams(queryString)
    const sessionId = urlParams.get('session_id')
    
    console.log('Payment success page loaded, session_id:', sessionId)

    // Verify payment and upgrade user immediately
    const verifyAndUpgrade = async () => {
      if (!sessionId || !accessToken) {
        console.log('Missing sessionId or accessToken')
        return
      }

      try {
        console.log('🔍 Verifying payment with Stripe...')
        const result = await verifyPayment(accessToken, sessionId)
        console.log('✅ Payment verified:', result)

        // Force refresh the session to get updated user data from the server
        const { data: { session }, error } = await supabaseClient.auth.refreshSession()
        
        console.log('🔄 Session after refresh:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          metadata: session?.user?.user_metadata
        })
        
        if (error) {
          console.error('Error refreshing session:', error)
          return
        }
        
        if (session?.user) {
          console.log('✅ User upgraded! New metadata:', session.user.user_metadata)
          setAuth(
            {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.user_metadata?.displayName || '',
              displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.name || '',
              avatarUrl: session.user.user_metadata?.avatarUrl,
              decksPublic: session.user.user_metadata?.decksPublic ?? true,
              subscriptionTier: session.user.user_metadata?.subscriptionTier || 'free',
              subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry,
            },
            session.access_token
          )
        }
      } catch (error) {
        console.error('Error verifying payment:', error)
      }
    }

    // Verify immediately
    verifyAndUpgrade()
    
    // Also refresh session periodically (in case webhook is delayed)
    const refreshUserSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        
        if (error) {
          console.error('Error refreshing session:', error)
          return
        }
        
        if (session?.user) {
          setAuth(
            {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.user_metadata?.displayName || '',
              displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.name || '',
              avatarUrl: session.user.user_metadata?.avatarUrl,
              decksPublic: session.user.user_metadata?.decksPublic ?? true,
              subscriptionTier: session.user.user_metadata?.subscriptionTier || 'free',
              subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry,
            },
            session.access_token
          )
        }
      } catch (error) {
        console.error('Error refreshing user session:', error)
      }
    }
    
    // Refresh every 2 seconds for up to 10 seconds (in case webhook is delayed)
    const interval = setInterval(refreshUserSession, 2000)
    setTimeout(() => clearInterval(interval), 10000)

    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigateTo('decks')
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [navigateTo, setAuth, accessToken, user])

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-4">
            Welcome to Premium! 🎉
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Your payment was successful. You now have access to all premium features!
          </p>

          {/* Premium Features List */}
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-700 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg text-gray-900 dark:text-gray-100">
                You can now:
              </h3>
            </div>
            <ul className="space-y-2 text-left">
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                Generate unlimited flashcards with AI
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                Create unlimited decks and cards
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                Add images to your flashcards
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                Import and publish community decks
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigateTo('decks')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Go to My Decks
            </Button>
            <Button
              onClick={() => navigateTo('ai-generate')}
              variant="outline"
              className="w-full"
            >
              Try AI Generation
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            Redirecting to your decks in 5 seconds...
          </p>
        </div>
      </div>
    </AppLayout>
  )
}