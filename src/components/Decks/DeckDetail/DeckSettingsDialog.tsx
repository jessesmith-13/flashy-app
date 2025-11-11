import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select'
import { ColorPicker } from '../../ColorPicker'
import { EmojiPicker } from '../../EmojiPicker'
import { DECK_CATEGORIES } from '../../../../utils/categories'

interface DeckSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  emoji: string
  color: string
  category: string
  subtopic: string
  onNameChange: (name: string) => void
  onEmojiChange: (emoji: string) => void
  onColorChange: (color: string) => void
  onCategoryChange: (category: string) => void
  onSubtopicChange: (subtopic: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function DeckSettingsDialog({
  open,
  onOpenChange,
  name,
  emoji,
  color,
  category,
  subtopic,
  onNameChange,
  onEmojiChange,
  onColorChange,
  onCategoryChange,
  onSubtopicChange,
  onSubmit
}: DeckSettingsDialogProps) {
  const handleCategoryChange = (value: string) => {
    onCategoryChange(value)
    onSubtopicChange('') // Reset subtopic when category changes
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Deck</DialogTitle>
          <DialogDescription>
            Update your deck's name, emoji, or color theme.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="editName">Deck Name</Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <EmojiPicker 
            emoji={emoji} 
            onChange={onEmojiChange}
          />

          <ColorPicker 
            color={color} 
            onChange={onColorChange}
          />

          <div>
            <Label htmlFor="editCategory">Category (for publishing)</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {DECK_CATEGORIES.map(cat => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category && (
            <div>
              <Label htmlFor="editSubtopic">Subtopic</Label>
              <Select value={subtopic} onValueChange={onSubtopicChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a subtopic..." />
                </SelectTrigger>
                <SelectContent>
                  {DECK_CATEGORIES.find(c => c.category === category)?.subtopics.map(subtopic => (
                    <SelectItem key={subtopic} value={subtopic}>
                      {subtopic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
