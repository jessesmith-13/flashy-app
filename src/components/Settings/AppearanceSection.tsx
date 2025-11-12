import { Switch } from '../../ui/switch'
import { Label } from '../../ui/label'
import { Moon } from 'lucide-react'

interface AppearanceSectionProps {
  darkMode: boolean
  onDarkModeChange: (checked: boolean) => void
}

export function AppearanceSection({
  darkMode,
  onDarkModeChange
}: AppearanceSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg text-gray-900 dark:text-gray-100 mb-4">Appearance</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <Label htmlFor="darkMode" className="text-sm">
                Dark Mode
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Toggle between light and dark theme</p>
            </div>
          </div>
          <Switch
            id="darkMode"
            checked={darkMode}
            onCheckedChange={onDarkModeChange}
          />
        </div>
      </div>
    </div>
  )
}
