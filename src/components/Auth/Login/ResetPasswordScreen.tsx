import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'  // Adjust path
import { AuthHeader } from './AuthHeader'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

export function ResetPasswordScreen() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

    useEffect(() => {
      const setupSession = async () => {
        console.log('🔍 Full hash:', window.location.hash)
        
        // Split on # to handle double-hash: #/reset-password#access_token=...
        const hashParts = window.location.hash.split('#')
        console.log('🔍 Hash parts:', hashParts)
        
        let accessToken = null
        let refreshToken = null
        let type = null
        
        // Check if there's a second hash with tokens
        if (hashParts.length > 2) {
          // Extract from second hash: #access_token=XXX&type=recovery
          const tokenHash = hashParts[2]
          const params = new URLSearchParams(tokenHash)
          accessToken = params.get('access_token')
          refreshToken = params.get('refresh_token')
          type = params.get('type')
          
          console.log('🔐 Extracted from double hash:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken,
            type 
          })
        }
        
        if (accessToken && type === 'recovery') {
          console.log('✅ Setting session with tokens from double hash...')
          
          try {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            
            if (sessionError) {
              console.error('❌ setSession error:', sessionError)
              setError('Password reset link is invalid or expired.')
              setHasValidSession(false)
            } else if (data.session) {
              console.log('✅ Session set successfully!')
              setHasValidSession(true)
              setError('')
              
              // Clean up the URL
              window.history.replaceState({}, '', '/#/reset-password')
            } else {
              console.log('❌ No session returned')
              setError('Failed to establish session.')
              setHasValidSession(false)
            }
          } catch (err) {
            console.error('❌ Session setup error:', err)
            setError('An error occurred.')
            setHasValidSession(false)
          }
        } else {
          // No tokens in URL, check if session already exists
          const { data: { session } } = await supabase.auth.getSession()
          
          console.log('🔐 Checking existing session:', !!session)
          
          if (session) {
            setHasValidSession(true)
          } else {
            setError('Invalid or expired password reset link. Please request a new one.')
            setHasValidSession(false)
          }
        }
        
        setCheckingSession(false)
      }
      
      setupSession()
    }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      console.log('🔄 Updating password...')
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('❌ Update error:', updateError)
        throw updateError
      }

      console.log('✅ Password updated successfully')
      setSuccess(true)
      toast.success('Password updated successfully!')
      
      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/login')
      }, 2000)
    } catch (err: unknown) {
      console.error('Password update error:', err)

      let message = 'Failed to update password. Please try again.'

      if (err instanceof Error) {
        message = err.message
      }

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-emerald-600 dark:text-emerald-400">Verifying reset link...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl mb-2 text-gray-900 dark:text-gray-100">Password Updated!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been successfully updated. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
        <AuthHeader 
          onBackToHome={handleBackToLogin}
          subtitle="Create a new password"
        />

        {!hasValidSession ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 p-4 rounded-lg text-sm border border-amber-200 dark:border-amber-800">
              <p className="mb-3">{error || 'This password reset link is invalid or has expired.'}</p>
              <Button
                onClick={handleBackToLogin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Back to Login
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
