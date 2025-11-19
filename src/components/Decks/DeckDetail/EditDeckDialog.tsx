import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Button } from '../../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select'
import { DECK_CATEGORIES } from '../../../../utils/categories'
import { ColorPicker } from '../../ColorPicker'
import { EmojiPicker } from '../../EmojiPicker'
import { Deck } from '../../../../store/useStore'

interface EditDeckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deck: Deck | null
  onUpdateDeck: (data: {
    name: string
    emoji: string
    color: string
    category?: string
    subtopic?: string
    difficulty?: string
  }) => Promise<void>
}

export function EditDeckDialog({ open, onOpenChange, deck, onUpdateDeck }: EditDeckDialogProps) {
  const [editDeckName, setEditDeckName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSubtopic, setEditSubtopic] = useState('')
  const [editDifficulty, setEditDifficulty] = useState<string>('')
  const [updating, setUpdating] = useState(false)

  // Update form values when deck changes
  useEffect(() => {
    if (deck) {
      setEditDeckName(deck.name)
      setEditEmoji(deck.emoji)
      setEditColor(deck.color)
      setEditCategory(deck.category || '')
      setEditSubtopic(deck.subtopic || '')
      setEditDifficulty(deck.difficulty || '')
    }
  }, [deck])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDeckName.trim()) return

    setUpdating(true)
    try {
      await onUpdateDeck({
        name: editDeckName,
        emoji: editEmoji,
        color: editColor,
        category: editCategory || undefined,
        subtopic: editSubtopic || undefined,
        difficulty: editDifficulty || undefined,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update deck:', error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Deck</DialogTitle>
          <DialogDescription>
            Update your deck's name, emoji, color, and category.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="editDeckName">Deck Name</Label>
            <Input
              id="editDeckName"
              placeholder="e.g., Spanish Vocabulary"
              value={editDeckName}
              onChange={(e) => setEditDeckName(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <EmojiPicker 
            emoji={editEmoji} 
            onChange={setEditEmoji}
          />

          <ColorPicker 
            color={editColor} 
            onChange={setEditColor}
          />

          <div>
            <Label htmlFor="editCategory">Category (Optional)</Label>
            <Select value={editCategory || 'none'} onValueChange={(value) => {
              setEditCategory(value === 'none' ? '' : value)
              setEditSubtopic('')
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {[...DECK_CATEGORIES].sort((a, b) => a.category.localeCompare(b.category)).map(cat => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editCategory && (
            <div>
              <Label htmlFor="editSubtopic">Subtopic (Optional)</Label>
              <Select value={editSubtopic || 'none'} onValueChange={(value) => setEditSubtopic(value === 'none' ? '' : value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a subtopic..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {[...(DECK_CATEGORIES.find(c => c.category === editCategory)?.subtopics || [])].sort((a, b) => a.localeCompare(b)).map(subtopic => (
                    <SelectItem key={subtopic} value={subtopic}>
                      {subtopic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="editDifficulty">Difficulty (Optional)</Label>
            <Select value={editDifficulty || 'none'} onValueChange={(value) => setEditDifficulty(value === 'none' ? '' : value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select difficulty level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="beginner">🟢 Beginner</SelectItem>
                <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                <SelectItem value="advanced">🟠 Advanced</SelectItem>
                <SelectItem value="expert">🔴 Expert</SelectItem>
                <SelectItem value="mixed">🌈 Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={updating}
          >
            {updating ? 'Updating...' : 'Update Deck'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
