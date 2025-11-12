import { Button } from '../../ui/button'
import { Trash2 } from 'lucide-react'

interface DangerZoneSectionProps {
  onDeleteAccount: () => void
}

export function DangerZoneSection({
  onDeleteAccount
}: DangerZoneSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-200 dark:border-red-900">
      <h2 className="text-lg text-red-600 dark:text-red-400 mb-4">Danger Zone</h2>
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Deleting your account will permanently remove all your data. This action
          cannot be undone.
        </p>
        <Button
          variant="outline"
          onClick={onDeleteAccount}
          className="w-full justify-start border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </div>
    </div>
  )
}
