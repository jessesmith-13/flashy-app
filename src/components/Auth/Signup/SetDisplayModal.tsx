import { useState } from 'react'

interface DisplayNameModalProps {
  onSubmit: (displayName: string) => void
  isLoading?: boolean
}

export function SetDisplayModal({ onSubmit, isLoading }: DisplayNameModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate display name
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters')
      return
    }
    
    if (displayName.trim().length > 30) {
      setError('Display name must be less than 30 characters')
      return
    }
    
    onSubmit(displayName.trim())
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl">Welcome to Flashy!</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          Please choose a display name to complete your profile.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="displayName" className="block text-sm mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setError('')
              }}
              placeholder="Enter your display name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !displayName.trim()}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Setting...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}