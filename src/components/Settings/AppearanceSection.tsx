import { Switch } from '../../ui/switch'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Moon, Volume2, Crown } from 'lucide-react'

interface AppearanceSectionProps {
  darkMode: boolean
  onDarkModeChange: (checked: boolean) => void
  ttsProvider: 'browser' | 'openai'
  onTTSProviderChange: (provider: 'browser' | 'openai') => void
  isPremium: boolean
}

export function AppearanceSection({
  darkMode,
  onDarkModeChange,
  ttsProvider,
  onTTSProviderChange,
  isPremium
}: AppearanceSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg text-gray-900 dark:text-gray-100 mb-4">Appearance & Features</h2>
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

        <div className="flex items-start justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 flex-1">
            <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="ttsProvider" className="text-sm">
                Text-to-Speech Provider
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Choose which TTS engine to use when reading cards aloud
              </p>
              <Select value={ttsProvider} onValueChange={onTTSProviderChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">
                    Browser TTS (Free)
                  </SelectItem>
                  <SelectItem value="openai" disabled={!isPremium}>
                    <div className="flex items-center gap-2">
                      OpenAI TTS (Premium)
                      {!isPremium && <Crown className="w-3 h-3 text-yellow-500" />}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {ttsProvider === 'browser' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Using your browser&apos;s built-in text-to-speech. Free and works offline!
                </p>
              )}
              {ttsProvider === 'openai' && isPremium && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  Using OpenAI&apos;s premium TTS with natural-sounding voices
                </p>
              )}
              {!isPremium && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Upgrade to premium for OpenAI&apos;s high-quality voices
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
