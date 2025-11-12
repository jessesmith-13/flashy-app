import { Button } from '../../../ui/button'

interface TestLoginButtonsProps {
  onTestLogin: (accountType: 'free' | 'premium' | 'superuser') => void
  onCreateAccount: () => void
  loading?: boolean
}

export function TestLoginButtons({ onTestLogin, onCreateAccount, loading }: TestLoginButtonsProps) {
  return (
    <div className="mt-6 text-center space-y-3">
      <div className="pt-3 border-t dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">New to Flashy?</p>
        <Button
          type="button"
          variant="outline"
          onClick={onCreateAccount}
          className="w-full"
        >
          Create Account
        </Button>
      </div>
      
      <div className="pt-3 border-t dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Just want to try it out?</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onTestLogin('free')}
            disabled={loading}
            className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {loading ? 'Setting up...' : '👤 Free User'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onTestLogin('premium')}
            disabled={loading}
            className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
          >
            {loading ? 'Setting up...' : '👑 Premium User'}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onTestLogin('superuser')}
          disabled={loading}
          className="w-full mt-2 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
        >
          {loading ? 'Setting up...' : '⚡ Flashy (Superuser)'}
        </Button>
      </div>
    </div>
  )
}
