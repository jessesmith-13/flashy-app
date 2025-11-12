import { Button } from '../../../ui/button'
import { CheckCircle2 } from 'lucide-react'

interface SignupSuccessProps {
  displayName: string
  onContinue: () => void
}

export function SignupSuccess({ displayName, onContinue }: SignupSuccessProps) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl text-gray-900 dark:text-gray-100 mb-2">
          Welcome to Flashy, {displayName}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your account has been created successfully.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Let's get started with your learning journey!
        </p>
      </div>

      <Button
        onClick={onContinue}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        Continue to Flashy
      </Button>
    </div>
  )
}
