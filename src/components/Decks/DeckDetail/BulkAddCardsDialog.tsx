import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Textarea } from '../../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select'
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
  frontAudio?: string
  backAudio?: string
  // Multiple-choice uses correctAnswers + incorrectAnswers arrays
  correctAnswers: string[]
  incorrectAnswers: string[]
  // Type-answer uses acceptedAnswers array
  acceptedAnswers: string[]
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
      correctAnswers: [''],
      incorrectAnswers: ['', '', ''],
      acceptedAnswers: [''],
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
      correctAnswers: [''],
      incorrectAnswers: ['', '', ''],
      acceptedAnswers: [''],
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

  // Multiple-choice: Update correct answers array
  const handleCorrectAnswerChange = (cardId: string, index: number, value: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const newCorrectAnswers = [...card.correctAnswers]
    newCorrectAnswers[index] = value
    handleCardChange(cardId, { correctAnswers: newCorrectAnswers })
  }

  // Multiple-choice: Update incorrect answers array
  const handleIncorrectAnswerChange = (cardId: string, index: number, value: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const newIncorrectAnswers = [...card.incorrectAnswers]
    newIncorrectAnswers[index] = value
    handleCardChange(cardId, { incorrectAnswers: newIncorrectAnswers })
  }

  // Multiple-choice: Add correct answer
  const handleAddCorrectAnswer = (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.correctAnswers.length >= 3) return

    handleCardChange(cardId, { correctAnswers: [...card.correctAnswers, ''] })
  }

  // Multiple-choice: Remove correct answer
  const handleRemoveCorrectAnswer = (cardId: string, index: number) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.correctAnswers.length <= 1) return

    const newCorrectAnswers = card.correctAnswers.filter((_, i) => i !== index)
    handleCardChange(cardId, { correctAnswers: newCorrectAnswers })
  }

  // Multiple-choice: Add incorrect answer
  const handleAddIncorrectAnswer = (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.incorrectAnswers.length >= 5) return

    handleCardChange(cardId, { incorrectAnswers: [...card.incorrectAnswers, ''] })
  }

  // Multiple-choice: Remove incorrect answer
  const handleRemoveIncorrectAnswer = (cardId: string, index: number) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.incorrectAnswers.length <= 1) return

    const newIncorrectAnswers = card.incorrectAnswers.filter((_, i) => i !== index)
    handleCardChange(cardId, { incorrectAnswers: newIncorrectAnswers })
  }

  // Type-answer: Update accepted answers array
  const handleAcceptedAnswerChange = (cardId: string, index: number, value: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const newAcceptedAnswers = [...card.acceptedAnswers]
    newAcceptedAnswers[index] = value
    handleCardChange(cardId, { acceptedAnswers: newAcceptedAnswers })
  }

  // Type-answer: Add accepted answer
  const handleAddAcceptedAnswer = (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.acceptedAnswers.length >= 10) return

    handleCardChange(cardId, { acceptedAnswers: [...card.acceptedAnswers, ''] })
  }

  // Type-answer: Remove accepted answer
  const handleRemoveAcceptedAnswer = (cardId: string, index: number) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.acceptedAnswers.length <= 1) return

    const newAcceptedAnswers = card.acceptedAnswers.filter((_, i) => i !== index)
    handleCardChange(cardId, { acceptedAnswers: newAcceptedAnswers })
  }

  const handleAudioUpload = async (cardId: string, field: 'front' | 'back', file: File) => {
    if (!onUploadAudio) return

    setUploadingAudioCardId(cardId)
    setUploadingAudioField(field)

    try {
      const audioUrl = await onUploadAudio(file)
      if (field === 'front') {
        handleCardChange(cardId, { frontAudio: audioUrl })
      } else {
        handleCardChange(cardId, { backAudio: audioUrl })
      }
    } finally {
      setUploadingAudioCardId(null)
      setUploadingAudioField(null)
    }
  }

  const handleSubmit = async () => {
    // Filter out cards based on card type requirements
    const filledCards = cards.filter(card => {
      const hasFront = card.front.trim() || card.frontImageFile
      
      if (card.cardType === 'multiple-choice') {
        const hasCorrect = card.correctAnswers.some(a => a.trim())
        const hasIncorrect = card.incorrectAnswers.some(a => a.trim())
        return hasFront && hasCorrect && hasIncorrect
      } else if (card.cardType === 'type-answer') {
        const hasBack = card.back.trim() || card.backImageFile
        return hasFront && hasBack
      } else {
        // classic-flip
        const hasBack = card.back.trim() || card.backImageFile
        return hasFront && hasBack
      }
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
                        {canAddImageToCard(userTier) && onUploadAudio && card.cardType === 'classic-flip' && (
                          <div className="mt-2">
                            <AudioRecorder
                              onAudioSave={(url) => handleCardChange(card.id, { frontAudio: url })}
                              currentAudioUrl={card.frontAudio}
                              onAudioRemove={() => handleCardChange(card.id, { frontAudio: '' })}
                              disabled={submitting || (uploadingAudioCardId === card.id && uploadingAudioField === 'front')}
                              label="Question Audio (Optional)"
                              onUploadAudio={(file) => handleAudioUpload(card.id, 'front', file)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Card Type Specific Fields */}
                      {card.cardType === 'multiple-choice' ? (
                        <>
                          {/* Correct Answers */}
                          <div>
                            <Label className="text-sm text-emerald-600 dark:text-emerald-400">
                              Correct Answer(s) ✓
                            </Label>
                            <div className="space-y-2 mt-1">
                              {card.correctAnswers.map((answer, ansIndex) => (
                                <div key={ansIndex} className="flex items-center gap-2">
                                  <Input
                                    placeholder={`Correct answer ${ansIndex + 1}...`}
                                    value={answer}
                                    onChange={(e) => handleCorrectAnswerChange(card.id, ansIndex, e.target.value)}
                                    className="flex-1 text-sm border-emerald-300 dark:border-emerald-700"
                                  />
                                  {card.correctAnswers.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveCorrectAnswer(card.id, ansIndex)}
                                      className="h-8 w-8 p-0 text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {card.correctAnswers.length < 3 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddCorrectAnswer(card.id)}
                                className="mt-2 text-xs text-emerald-600 border-emerald-300"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Correct Answer
                              </Button>
                            )}
                          </div>

                          {/* Incorrect Answers */}
                          <div>
                            <Label className="text-sm text-red-600 dark:text-red-400">
                              Incorrect Options ✗
                            </Label>
                            <div className="space-y-2 mt-1">
                              {card.incorrectAnswers.map((answer, ansIndex) => (
                                <div key={ansIndex} className="flex items-center gap-2">
                                  <Input
                                    placeholder={`Incorrect option ${ansIndex + 1}...`}
                                    value={answer}
                                    onChange={(e) => handleIncorrectAnswerChange(card.id, ansIndex, e.target.value)}
                                    className="flex-1 text-sm border-red-300 dark:border-red-700"
                                  />
                                  {card.incorrectAnswers.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveIncorrectAnswer(card.id, ansIndex)}
                                      className="h-8 w-8 p-0 text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {card.incorrectAnswers.length < 5 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddIncorrectAnswer(card.id)}
                                className="mt-2 text-xs text-red-600 border-red-300"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Incorrect Option
                              </Button>
                            )}
                          </div>
                        </>
                      ) : card.cardType === 'type-answer' ? (
                        <>
                          {/* Correct Answer (back field) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label htmlFor={`${card.id}-back`} className="text-sm">
                                Correct Answer
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
                              placeholder="Enter the correct answer..."
                              value={card.back}
                              onChange={(e) => handleCardChange(card.id, { back: e.target.value })}
                              className="min-h-[60px] text-sm"
                            />
                          </div>

                          {/* Accepted Answers (Alternative Spellings) */}
                          <div>
                            <Label className="text-sm text-gray-600 dark:text-gray-400">
                              Accepted Answers (Alternative spellings - optional)
                            </Label>
                            <div className="space-y-2 mt-1">
                              {card.acceptedAnswers.map((answer, ansIndex) => (
                                <div key={ansIndex} className="flex items-center gap-2">
                                  <Input
                                    placeholder={`Alternative answer ${ansIndex + 1}...`}
                                    value={answer}
                                    onChange={(e) => handleAcceptedAnswerChange(card.id, ansIndex, e.target.value)}
                                    className="flex-1 text-sm"
                                  />
                                  {card.acceptedAnswers.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveAcceptedAnswer(card.id, ansIndex)}
                                      className="h-8 w-8 p-0 text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {card.acceptedAnswers.length < 10 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddAcceptedAnswer(card.id)}
                                className="mt-2 text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Alternative Answer
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        // Classic Flip - Back field
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label htmlFor={`${card.id}-back`} className="text-sm">
                              Back (Answer)
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
                            placeholder="Enter answer..."
                            value={card.back}
                            onChange={(e) => handleCardChange(card.id, { back: e.target.value })}
                            className="min-h-[60px] text-sm"
                          />

                          {/* Back Image Upload (Classic Flip only) */}
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

                          {/* Back Audio Section */}
                          {canAddImageToCard(userTier) && onUploadAudio && (
                            <div className="mt-2">
                              <AudioRecorder
                                onAudioSave={(url) => handleCardChange(card.id, { backAudio: url })}
                                currentAudioUrl={card.backAudio}
                                onAudioRemove={() => handleCardChange(card.id, { backAudio: '' })}
                                disabled={submitting || (uploadingAudioCardId === card.id && uploadingAudioField === 'back')}
                                label="Answer Audio (Optional)"
                                onUploadAudio={(file) => handleAudioUpload(card.id, 'back', file)}
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
                      if (c.cardType === 'multiple-choice') {
                        const hasCorrect = c.correctAnswers.some(a => a.trim())
                        const hasIncorrect = c.incorrectAnswers.some(a => a.trim())
                        return hasFront && hasCorrect && hasIncorrect
                      } else {
                        const hasBack = c.back.trim() || c.backImageFile
                        return hasFront && hasBack
                      }
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
                        if (c.cardType === 'multiple-choice') {
                          const hasCorrect = c.correctAnswers.some(a => a.trim())
                          const hasIncorrect = c.incorrectAnswers.some(a => a.trim())
                          return hasFront && hasCorrect && hasIncorrect
                        } else {
                          const hasBack = c.back.trim() || c.backImageFile
                          return hasFront && hasBack
                        }
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
