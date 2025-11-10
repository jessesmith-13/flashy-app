import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Label } from '../ui/label'
import { Input } from '../ui/input'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
}

const PRESET_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5A2B', // brown
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
  '#84CC16', // lime
  '#06B6D4', // cyan
]

export function ColorPicker({ color, onChange, label = 'Choose a Color' }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(color)

  const handleHexInputChange = (value: string) => {
    setHexInput(value)
    // Only update if it's a valid hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onChange(value)
    }
  }

  const handleColorChange = (newColor: string) => {
    onChange(newColor)
    setHexInput(newColor)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Preset colors */}
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((presetColor) => (
          <button
            key={presetColor}
            type="button"
            onClick={() => handleColorChange(presetColor)}
            className={`h-10 rounded-lg border-2 transition-all hover:scale-105 ${
              color.toLowerCase() === presetColor.toLowerCase()
                ? 'border-gray-800 dark:border-white scale-105'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400'
            }`}
            style={{ backgroundColor: presetColor }}
            title={presetColor}
          />
        ))}
      </div>

      {/* Color picker with custom color selection */}
      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-all"
            >
              <div 
                className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-500" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Custom Color</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <HexColorPicker color={color} onChange={handleColorChange} />
          </PopoverContent>
        </Popover>

        {/* Hex input */}
        <div className="flex-1">
          <Input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexInputChange(e.target.value.toUpperCase())}
            placeholder="#000000"
            maxLength={7}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </div>
  )
}
