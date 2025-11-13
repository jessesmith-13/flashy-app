import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Textarea } from '../../../ui/textarea'
import { Checkbox } from '../../../ui/checkbox'
import { Badge } from '../../../ui/badge'
import { FlipVertical, CheckCircle, Keyboard, ImageIcon, Crown, X } from 'lucide-react'
import type { CardType } from '../../../../store/useStore'
import { canAddImageToCard } from '../../../../utils/subscription'

const CARD_TYPES: { value: CardType; label: string; icon: typeof FlipVertical; description: string }[] = [
  { value: 'classic-flip', label: 'Classic Flip', icon: FlipVertical, description: 'Flip card with ✓/✗ rating' },
  { value: 'multiple-choice', label: 'Multiple Choice', icon: CheckCircle, description: 'Choose from 4 options' },
  { value: 'type-answer', label: 'Type to Answer', icon: Keyboard, description: 'Type the exact answer' },
]

interface AddCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardType: CardType
  front: string
  back: string
  frontImageUrl: string
  frontImageFile: File | null
  backImageUrl: string
  backImageFile: File | null
  options: string[]
  correctIndices: number[]
  acceptedAnswers: string
  creating: boolean
  uploadingImage: boolean
  uploadingBackImage: boolean
  userTier?: string
  onCardTypeChange: (type: CardType) => void
  onFrontChange: (value: string) => void
  onBackChange: (value: string) => void
  onFrontImageChange: (file: File | null, url: string) => void
  onBackImageChange: (file: File | null, url: string) => void
  onOptionsChange: (options: string[]) => void
  onCorrectIndicesChange: (indices: number[]) => void
  onAcceptedAnswersChange: (value: string) => void
  onSubmit: (e: React.FormEvent, closeDialog?: boolean) => void
  onUpgradeClick: () => void
}

export function AddCardModal({
  open,
  onOpenChange,
  cardType,
  front,
  back,
  frontImageUrl,
  frontImageFile,
  backImageUrl,
  backImageFile,
  options,
  correctIndices,
  acceptedAnswers,
  creating,
  uploadingImage,
  uploadingBackImage,
  userTier,
  onCardTypeChange,
  onFrontChange,
  onBackChange,
  onFrontImageChange,
  onBackImageChange,
  onOptionsChange,
  onCorrectIndicesChange,
  onAcceptedAnswersChange,
  onSubmit,
  onUpgradeClick
}: AddCardModalProps) {
  const handleAddOption = () => {
    onOptionsChange([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    onOptionsChange(newOptions)
    // Update correct indices if needed
    const newCorrectIndices = correctIndices
      .map(i => i > index ? i - 1 : i)
      .filter(i => i < newOptions.length)
    onCorrectIndicesChange(newCorrectIndices.length > 0 ? newCorrectIndices : [0])
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    onOptionsChange(newOptions)
  }

  const handleToggleCorrect = (index: number) => {
    if (correctIndices.includes(index)) {
      const newIndices = correctIndices.filter(i => i !== index)
      onCorrectIndicesChange(newIndices.length > 0 ? newIndices : [index])
    } else {
      onCorrectIndicesChange([...correctIndices, index])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Card</DialogTitle>
          <DialogDescription>
            Choose a card type and create your flashcard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => onSubmit(e, true)} className="space-y-4 mt-4">
          <div>
            <Label>Card Type</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {CARD_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onCardTypeChange(type.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      cardType === type.value
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${cardType === type.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
                      <div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">{type.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="cardFront">
              {cardType === 'classic-flip' ? 'Front (Question)' : 'Question'}
            </Label>
            <Textarea
              id="cardFront"
              placeholder={
                cardType === 'classic-flip' 
                  ? 'What is the capital of France? (or add an image below)'
                  : cardType === 'multiple-choice'
                  ? 'Which city is the capital of France?'
                  : 'What is the capital of France?'
              }
              value={front}
              onChange={(e) => onFrontChange(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Question Image */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="cardFrontImage" className="text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Question Image <span className="text-xs text-gray-500">(optional)</span>
              </Label>
              {userTier === 'free' && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
            {userTier === 'free' ? (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Crown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-900">Premium Feature</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Upgrade to add images to your flashcards
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onUpgradeClick}
                      className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Input
                  id="cardFrontImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const previewUrl = URL.createObjectURL(file)
                      onFrontImageChange(file, previewUrl)
                    }
                  }}
                  className="mt-1"
                  disabled={uploadingImage}
                />
                {uploadingImage && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">Uploading image...</p>
                  </div>
                )}
                {frontImageUrl && !uploadingImage && (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-lg overflow-hidden border">
                      <img src={frontImageUrl} alt="Question preview" className="w-full h-32 object-cover" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onFrontImageChange(null, '')}
                      className="w-full"
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {cardType === 'multiple-choice' ? (
            <div>
              <Label className="text-sm">Options (check correct answers)</Label>
              <div className="space-y-2 mt-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox
                      checked={correctIndices.includes(index)}
                      onCheckedChange={() => handleToggleCorrect(index)}
                      className="flex-shrink-0"
                    />
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full mt-2"
              >
                Add Option
              </Button>
            </div>
          ) : (
            <div>
              <Label htmlFor="cardBack">
                {cardType === 'classic-flip' ? 'Back (Answer)' : 'Correct Answer'}
              </Label>
              <Textarea
                id="cardBack"
                placeholder={cardType === 'classic-flip' ? 'Paris (or add an image below)' : 'Paris'}
                value={back}
                onChange={(e) => onBackChange(e.target.value)}
                required={cardType !== 'classic-flip'}
                className="mt-1 min-h-[80px]"
              />
            </div>
          )}

          {/* Answer Image (Classic Flip Only) */}
          {cardType === 'classic-flip' && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="cardBackImage" className="text-sm text-gray-600 dark:text-gray-400">
                  Answer Image (Optional)
                </Label>
                {!canAddImageToCard(userTier) && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                    Premium
                  </Badge>
                )}
              </div>
              {!canAddImageToCard(userTier) ? (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    Upgrade to add images to your flashcard answers
                  </p>
                  <Button
                    type="button"
                    onClick={onUpgradeClick}
                    className="mt-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                    size="sm"
                  >
                    Upgrade Now
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="cardBackImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const previewUrl = URL.createObjectURL(file)
                        onBackImageChange(file, previewUrl)
                      }
                    }}
                    className="mt-1"
                    disabled={uploadingBackImage}
                  />
                  {uploadingBackImage && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">Uploading image...</p>
                    </div>
                  )}
                  {backImageUrl && !uploadingBackImage && (
                    <div className="mt-2 space-y-2">
                      <div className="rounded-lg overflow-hidden border">
                        <img src={backImageUrl} alt="Answer preview" className="w-full h-32 object-cover" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onBackImageChange(null, '')}
                        className="w-full"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {cardType === 'type-answer' && (
            <div>
              <Label htmlFor="acceptedAnswers" className="text-sm">
                Alternative Accepted Answers <span className="text-xs text-gray-500">(optional, comma-separated)</span>
              </Label>
              <Input
                id="acceptedAnswers"
                value={acceptedAnswers}
                onChange={(e) => onAcceptedAnswersChange(e.target.value)}
                placeholder="e.g. Paris, paris, PARIS"
                className="mt-1"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={creating}
            >
              {creating ? 'Adding...' : 'Add Card'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                onSubmit(e as any, false)
              }}
              disabled={creating}
              className="flex-1"
            >
              Add & Continue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
