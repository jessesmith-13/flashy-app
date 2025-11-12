import { useState } from 'react'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'

interface SignupFormProps {
  onSubmit: (displayName: string, email: string, password: string) => Promise<void>
  onLoginClick: () => void
  error?: string
  loading?: boolean
}

export function SignupForm({ onSubmit, onLoginClick, error, loading }: SignupFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(displayName, email, password)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="mt-1"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This will be shown publicly instead of your email</p>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1"
          />
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onLoginClick}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm"
        >
          Already have an account? <span className="underline">Login here</span>
        </button>
      </div>
    </>
  )
}
