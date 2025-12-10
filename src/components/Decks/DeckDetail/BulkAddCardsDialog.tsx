import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Textarea } from '../../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select'
import { Checkbox } from '../../../ui/checkbox'
import { Loader2, Plus, Trash2, Sparkles, Upload, X } from 'lucide-react'
import type { CardType } from '../../../../store/useStore'
import { AudioRecorder } from './AudioRecorder'
import { canAddImageToCard } from '../../../../utils/subscription'

interface CardFormData {
  id: string
  cardType: CardType
  front: string
  back: string
  frontImageUrl: string
  frontImageFile: File | null
  backImageUrl: string
  backImageFile: File | null
  frontAudioUrl?: string
  backAudioUrl?: string
  options: string[]
  correctIndices: number[]
  acceptedAnswers: string
}

interface BulkAddCardsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (cards: CardFormData[]) => Promise<void>
  deckFrontLanguage?: string
  deckBackLanguage?: string
  userTier?: string
  onTranslate?: (text: string, language: string) => Promise<string>
  onUploadImage?: (file: File) => Promise<string>
  onUploadAudio?: (file: File) => Promise<string>
}

export function BulkAddCardsDialog({
  open,
  onOpenChange,
  onSubmit,
  deckFrontLanguage,
  deckBackLanguage,
  userTier,
  onTranslate,
  onUploadImage,
  onUploadAudio
}: BulkAddCardsDialogProps) {
  const [step, setStep] = useState<'select-count' | 'fill-cards'>('select-count')
  const [cardCount, setCardCount] = useState('10')
  const [cards, setCards] = useState<CardFormData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [translatingCardId, setTranslatingCardId] = useState<string | null>(null)
  const [translatingField, setTranslatingField] = useState<'front' | 'back' | null>(null)
  const [uploadingImageCardId, setUploadingImageCardId] = useState<string | null>(null)
  const [uploadingImageField, setUploadingImageField] = useState<'front' | 'back' | null>(null)
  const [uploadingAudioCardId, setUploadingAudioCardId] = useState<string | null>(null)
  const [uploadingAudioField, setUploadingAudioField] = useState<'front' | 'back' | null>(null)

  const handleCountSubmit = () => {
    const count = parseInt(cardCount)
    if (isNaN(count) || count < 1 || count > 50) {
      return
    }

    const newCards: CardFormData[] = Array.from({ length: count }, (_, i) => ({
      id: `card-${i}`,
      cardType: 'classic-flip',
      front: '',
      back: '',
      frontImageUrl: '',
      frontImageFile: null,
      backImageUrl: '',
      backImageFile: null,
      options: ['', ''],
      correctIndices: [0],
      acceptedAnswers: '',
    }))
    
    setCards(newCards)
    setStep('fill-cards')
  }

  const handleCardChange = (id: string, updates: Partial<CardFormData>) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, ...updates } : card
    ))
  }

  const handleCardTypeChange = (id: string, cardType: CardType) => {
    handleCardChange(id, { cardType })
  }

  const handleRemoveCard = (id: string) => {
    setCards(cards.filter(card => card.id !== id))
  }

  const handleAddCard = () => {
    if (cards.length >= 50) return
    
    setCards([...cards, {
      id: `card-${Date.now()}`,
      cardType: 'classic-flip',
      front: '',
      back: '',
      frontImageUrl: '',
      frontImageFile: null,
      backImageUrl: '',
      backImageFile: null,
      options: ['', ''],
      correctIndices: [0],
      acceptedAnswers: '',
    }])
  }

  const handleTranslate = async (cardId: string, field: 'front' | 'back') => {
    if (!onTranslate) return
    
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const text = field === 'front' ? card.front : card.back
    const language = field === 'front' ? deckFrontLanguage : deckBackLanguage

    if (!text.trim() || !language) return

    setTranslatingCardId(cardId)
    setTranslatingField(field)

    try {
      const translated = await onTranslate(text, language)
      handleCardChange(cardId, { [field]: translated })
    } finally {
      setTranslatingCardId(null)
      setTranslatingField(null)
    }
  }

  const handleImageUpload = async (cardId: string, field: 'front' | 'back', file: File) => {
    if (!onUploadImage) return

    setUploadingImageCardId(cardId)
    setUploadingImageField(field)

    try {
      const imageUrl = await onUploadImage(file)
      if (field === 'front') {
        handleCardChange(cardId, { frontImageFile: file, frontImageUrl: imageUrl })
      } else {
        handleCardChange(cardId, { backImageFile: file, backImageUrl: imageUrl })
      }
    } finally {
      setUploadingImageCardId(null)
      setUploadingImageField(null)
    }
  }

  const handleRemoveImage = (cardId: string, field: 'front' | 'back') => {
    if (field === 'front') {
      handleCardChange(cardId, { frontImageFile: null, frontImageUrl: '' })
    } else {
      handleCardChange(cardId, { backImageFile: null, backImageUrl: '' })
    }
  }

  const handleOptionChange = (cardId: string, index: number, value: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const newOptions = [...card.options]
    newOptions[index] = value
    handleCardChange(cardId, { options: newOptions })
  }

  const handleAddOption = (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.options.length >= 6) return

    handleCardChange(cardId, { options: [...card.options, ''] })
  }

  const handleRemoveOption = (cardId: string, index: number) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.options.length <= 2) return

    const newOptions = card.options.filter((_, i) => i !== index)
    const newCorrectIndices = card.correctIndices
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i)
    
    handleCardChange(cardId, { 
      options: newOptions, 
      correctIndices: newCorrectIndices.length > 0 ? newCorrectIndices : [0] 
    })
  }

  const handleToggleCorrectAnswer = (cardId: string, index: number) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const newCorrectIndices = card.correctIndices.includes(index)
      ? card.correctIndices.filter(i => i !== index)
      : [...card.correctIndices, index]

    if (newCorrectIndices.length > 0) {
      handleCardChange(cardId, { correctIndices: newCorrectIndices })
    }
  }

  const handleAudioUpload = async (cardId: string, field: 'front' | 'back', file: File) => {
    if (!onUploadAudio) return

    setUploadingAudioCardId(cardId)
    setUploadingAudioField(field)

    try {
      const audioUrl = await onUploadAudio(file)
      if (field === 'front') {
        handleCardChange(cardId, { frontAudioUrl: audioUrl })
      } else {
        handleCardChange(cardId, { backAudioUrl: audioUrl })
      }
    } finally {
      setUploadingAudioCardId(null)
      setUploadingAudioField(null)
    }
  }

  const handleSubmit = async () => {
    const filledCards = cards.filter(card => {
      const hasFront = card.front.trim() || card.frontImageFile
      const hasBack = card.back.trim() || card.backImageFile || card.cardType === 'multiple-choice'
      return hasFront && hasBack
    })
    
    if (filledCards.length === 0) {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(filledCards)
      setStep('select-count')
      setCardCount('10')
      setCards([])
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    setStep('select-count')
    setCards([])
  }

  const handleClose = () => {
    setStep('select-count')
    setCardCount('10')
    setCards([])
    onOpenChange(false)
  }

  const isPremium = userTier !== 'free'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'select-count' ? (
          <>
            <DialogHeader>
              <DialogTitle>Bulk Add Cards</DialogTitle>
              <DialogDescription>
                How many cards would you like to add? (Maximum 50)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="cardCount">Number of Cards</Label>
                <Input
                  id="cardCount"
                  type="number"
                  min="1"
                  max="50"
                  value={cardCount}
                  onChange={(e) => setCardCount(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCountSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!cardCount || parseInt(cardCount) < 1 || parseInt(cardCount) > 50}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add {cards.length} Cards</DialogTitle>
              <DialogDescription>
                Fill in the details for each card. All card types and features are supported.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
                {cards.map((card, index) => (
                  <div 
                    key={card.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm text-gray-900 dark:text-gray-100">
                        Card {index + 1}
                      </h4>
                      {cards.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCard(card.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Card Type Selector */}
                      <div>
                        <Label htmlFor={`${card.id}-type`} className="text-sm">Card Type</Label>
                        <Select 
                          value={card.cardType} 
                          onValueChange={(value) => handleCardTypeChange(card.id, value as CardType)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classic-flip">🔄 Classic Flip</SelectItem>
                            <SelectItem value="multiple-choice">✅ Multiple Choice</SelectItem>
                            <SelectItem value="type-answer">⌨️ Type Answer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Front (Question) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor={`${card.id}-front`} className="text-sm">
                            {card.cardType === 'multiple-choice' ? 'Question' : 'Front (Question)'}
                          </Label>
                          {isPremium && deckFrontLanguage && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTranslate(card.id, 'front')}
                              disabled={!card.front.trim() || (translatingCardId === card.id && translatingField === 'front')}
                              className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                              {translatingCardId === card.id && translatingField === 'front' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Translate
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        <Textarea
                          id={`${card.id}-front`}
                          placeholder="Enter question..."
                          value={card.front}
                          onChange={(e) => handleCardChange(card.id, { front: e.target.value })}
                          className="min-h-[60px] text-sm"
                        />

                        {/* Front Image Upload */}
                        {card.cardType === 'classic-flip' && (
                          <div className="mt-2">
                            {card.frontImageUrl || card.frontImageFile ? (
                              <div className="relative inline-block">
                                <img 
                                  src={card.frontImageFile ? URL.createObjectURL(card.frontImageFile) : card.frontImageUrl} 
                                  alt="Front" 
                                  className="max-w-full h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveImage(card.id, 'front')}
                                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file && onUploadImage) {
                                      handleImageUpload(card.id, 'front', file)
                                    }
                                  }}
                                  className="hidden"
                                  id={`${card.id}-front-image`}
                                  disabled={uploadingImageCardId === card.id && uploadingImageField === 'front'}
                                />
                                <Label htmlFor={`${card.id}-front-image`}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    asChild
                                    disabled={uploadingImageCardId === card.id && uploadingImageField === 'front'}
                                  >
                                    <span>
                                      {uploadingImageCardId === card.id && uploadingImageField === 'front' ? (
                                        <>
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          Uploading...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="w-3 h-3 mr-1" />
                                          Add Image (Optional)
                                        </>
                                      )}
                                    </span>
                                  </Button>
                                </Label>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Front Audio Section */}
                        {canAddImageToCard(userTier) && onUploadAudio && (
                          <div>
                            <AudioRecorder
                              onAudioSave={(url) => handleCardChange(card.id, { frontAudioUrl: url })}
                              currentAudioUrl={card.frontAudioUrl}
                              onAudioRemove={() => handleCardChange(card.id, { frontAudioUrl: '' })}
                              disabled={submitting || (uploadingAudioCardId === card.id && uploadingAudioField === 'front')}
                              label="Question Audio (Optional)"
                              onUploadAudio={(file) => handleAudioUpload(card.id, 'front', file)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Back (Answer) or Multiple Choice Options */}
                      {card.cardType === 'multiple-choice' ? (
                        <div>
                          <Label className="text-sm">Answer Options</Label>
                          <div className="space-y-2 mt-1">
                            {card.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <Checkbox
                                  checked={card.correctIndices.includes(optIndex)}
                                  onCheckedChange={() => handleToggleCorrectAnswer(card.id, optIndex)}
                                  id={`${card.id}-option-${optIndex}`}
                                />
                                <Input
                                  placeholder={`Option ${optIndex + 1}...`}
                                  value={option}
                                  onChange={(e) => handleOptionChange(card.id, optIndex, e.target.value)}
                                  className="flex-1 text-sm"
                                />
                                {card.options.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveOption(card.id, optIndex)}
                                    className="h-8 w-8 p-0 text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          {card.options.length < 6 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddOption(card.id)}
                              className="mt-2 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Option
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label htmlFor={`${card.id}-back`} className="text-sm">
                              {card.cardType === 'type-answer' ? 'Correct Answer' : 'Back (Answer)'}
                            </Label>
                            {isPremium && deckBackLanguage && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTranslate(card.id, 'back')}
                                disabled={!card.back.trim() || (translatingCardId === card.id && translatingField === 'back')}
                                className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              >
                                {translatingCardId === card.id && translatingField === 'back' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Translate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          <Textarea
                            id={`${card.id}-back`}
                            placeholder={card.cardType === 'type-answer' ? 'Enter the correct answer...' : 'Enter answer...'}
                            value={card.back}
                            onChange={(e) => handleCardChange(card.id, { back: e.target.value })}
                            className="min-h-[60px] text-sm"
                          />

                          {/* Back Image Upload (Classic Flip only) */}
                          {card.cardType === 'classic-flip' && (
                            <div className="mt-2">
                              {card.backImageUrl || card.backImageFile ? (
                                <div className="relative inline-block">
                                  <img 
                                    src={card.backImageFile ? URL.createObjectURL(card.backImageFile) : card.backImageUrl} 
                                    alt="Back" 
                                    className="max-w-full h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveImage(card.id, 'back')}
                                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file && onUploadImage) {
                                        handleImageUpload(card.id, 'back', file)
                                      }
                                    }}
                                    className="hidden"
                                    id={`${card.id}-back-image`}
                                    disabled={uploadingImageCardId === card.id && uploadingImageField === 'back'}
                                  />
                                  <Label htmlFor={`${card.id}-back-image`}>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      asChild
                                      disabled={uploadingImageCardId === card.id && uploadingImageField === 'back'}
                                    >
                                      <span>
                                        {uploadingImageCardId === card.id && uploadingImageField === 'back' ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Uploading...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-3 h-3 mr-1" />
                                            Add Image (Optional)
                                          </>
                                        )}
                                      </span>
                                    </Button>
                                  </Label>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Back Audio Section */}
                          {canAddImageToCard(userTier) && onUploadAudio && (
                            <div>
                              <AudioRecorder
                                onAudioSave={(url) => handleCardChange(card.id, { backAudioUrl: url })}
                                currentAudioUrl={card.backAudioUrl}
                                onAudioRemove={() => handleCardChange(card.id, { backAudioUrl: '' })}
                                disabled={submitting || (uploadingAudioCardId === card.id && uploadingAudioField === 'back')}
                                label="Answer Audio (Optional)"
                                onUploadAudio={(file) => handleAudioUpload(card.id, 'back', file)}
                              />
                            </div>
                          )}

                          {/* Accepted Answers (Type Answer only) */}
                          {card.cardType === 'type-answer' && (
                            <div className="mt-2">
                              <Label htmlFor={`${card.id}-accepted`} className="text-xs text-gray-600 dark:text-gray-400">
                                Accepted Answers (comma-separated, optional)
                              </Label>
                              <Input
                                id={`${card.id}-accepted`}
                                placeholder="e.g., answer, ans, a"
                                value={card.acceptedAnswers}
                                onChange={(e) => handleCardChange(card.id, { acceptedAnswers: e.target.value })}
                                className="mt-1 text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {cards.length < 50 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCard}
                  className="w-full border-dashed border-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Card
                </Button>
              )}

              <div className="flex gap-2 justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={submitting || cards.filter(c => {
                      const hasFront = c.front.trim() || c.frontImageFile
                      const hasBack = c.back.trim() || c.backImageFile || c.cardType === 'multiple-choice'
                      return hasFront && hasBack
                    }).length === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Cards...
                      </>
                    ) : (
                      `Add ${cards.filter(c => {
                        const hasFront = c.front.trim() || c.frontImageFile
                        const hasBack = c.back.trim() || c.backImageFile || c.cardType === 'multiple-choice'
                        return hasFront && hasBack
                      }).length} Cards`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}