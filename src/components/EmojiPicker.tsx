import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Label } from '../ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { ScrollArea } from '../ui/scroll-area'
import { Smile } from 'lucide-react'

interface EmojiPickerProps {
  emoji: string
  onChange: (emoji: string) => void
  label?: string
}

const PRESET_EMOJIS = ['📚', '🎓', '🧠', '📖', '✏️', '🎯', '💡', '🔬', '🌍', '🎨']

const EMOJI_CATEGORIES = {
  education: {
    label: 'Education',
    emojis: ['📚', '🎓', '🧠', '📖', '✏️', '🎯', '💡', '🔬', '🌍', '🎨', '📝', '📊', '📈', '🖊️', '🖍️', '✒️', '🖌️', '📐', '📏', '📌', '📍', '🗂️', '📋', '📄', '📃', '📑', '🗒️', '📰', '🔖']
  },
  symbols: {
    label: 'Symbols',
    emojis: ['⭐', '✨', '💫', '🌟', '💯', '🔥', '⚡', '💥', '✅', '❌', '❗', '❓', '💬', '💭', '🎵', '🎶', '🔔', '🔕', '📢', '📣', '💝', '💖', '💗', '💓', '💞', '💕', '♥️', '❤️']
  },
  nature: {
    label: 'Nature',
    emojis: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🌱', '🌿', '🍀', '🌾', '🌵', '🌴', '🌳', '🌲', '🍁', '🍂', '🍃', '🌊', '🌈', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓']
  },
  food: {
    label: 'Food',
    emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🍄', '🥜', '🌰', '🍞']
  },
  activities: {
    label: 'Activities',
    emojis: ['🎮', '🎯', '🎲', '🎰', '🎳', '🎪', '🎭', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎡', '🎢', '🎠', '🖼️', '🎫', '🎟️', '🏆', '🥇', '🎖️', '🏅', '⚾']
  },
  travel: {
    label: 'Travel',
    emojis: ['✈️', '🚀', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙']
  },
  objects: {
    label: 'Objects',
    emojis: ['💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾', '💿', '📀', '📱', '☎️', '📞', '📟', '📠', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷']
  },
  animals: {
    label: 'Animals',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝']
  },
}

export function EmojiPicker({ emoji, onChange, label = 'Choose an Emoji' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('education')

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Preset emojis */}
      <div className="grid grid-cols-5 gap-2">
        {PRESET_EMOJIS.map((presetEmoji) => (
          <button
            key={presetEmoji}
            type="button"
            onClick={() => onChange(presetEmoji)}
            className={`text-2xl p-3 rounded-lg border-2 transition-all hover:scale-105 ${
              emoji === presetEmoji
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 scale-105'
                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
            }`}
          >
            {presetEmoji}
          </button>
        ))}
      </div>

      {/* More emojis button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-all text-sm text-gray-700 dark:text-gray-300"
          >
            <Smile className="w-4 h-4" />
            <span>More Emojis</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b dark:border-gray-700 px-2 pt-2">
              <TabsList className="grid grid-cols-4 w-full h-auto gap-1 bg-transparent">
                <TabsTrigger 
                  value="education" 
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  📚
                </TabsTrigger>
                <TabsTrigger 
                  value="symbols"
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  ⭐
                </TabsTrigger>
                <TabsTrigger 
                  value="nature"
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  🌸
                </TabsTrigger>
                <TabsTrigger 
                  value="food"
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  🍎
                </TabsTrigger>
              </TabsList>
              <TabsList className="grid grid-cols-4 w-full h-auto gap-1 bg-transparent mt-1">
                <TabsTrigger 
                  value="activities"
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  🎮
                </TabsTrigger>
                <TabsTrigger 
                  value="travel"
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  ✈️
                </TabsTrigger>
                <TabsTrigger 
                  value="objects"
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  💻
                </TabsTrigger>
                <TabsTrigger 
                  value="animals"
                  className="text-xs px-2 py-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30"
                >
                  🐶
                </TabsTrigger>
              </TabsList>
            </div>

            {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
              <TabsContent key={key} value={key} className="p-3 m-0">
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-7 gap-1">
                    {category.emojis.map((categoryEmoji, index) => (
                      <button
                        key={`${key}-${index}`}
                        type="button"
                        onClick={() => {
                          onChange(categoryEmoji)
                          setOpen(false)
                        }}
                        className={`text-2xl p-2 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all ${
                          emoji === categoryEmoji
                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                            : ''
                        }`}
                      >
                        {categoryEmoji}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
}
