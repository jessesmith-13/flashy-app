import React, { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import * as api from '../../../utils/api'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { ArrowLeft, Sparkles, MessageSquare, FileSpreadsheet, FileText, Upload, Check, X, Edit2, Lock, Crown, Music, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { DECK_LANGUAGES } from '../../../utils/languages'
import * as audioSynthesis from '../../../utils/audioSynthesis'

interface GeneratedCard {
  front: string
  back: string
  cardType?: string
  options?: string[]
  acceptedAnswers?: string[]
  frontAudio?: string
  backAudio?: string
  note?: string  // Track if OpenAI adds this so we can debug it
}

export function AIGenerateScreen() {
  const { selectedDeckId, decks, addCard, accessToken, updateDeck, user } = useStore()
  const { navigateTo } = useNavigation()
  const [activeTab, setActiveTab] = useState('chat')
  
  // AI Chat state
  const [topic, setTopic] = useState('')
  const [numCards, setNumCards] = useState('10')
  const [cardTypes, setCardTypes] = useState({
    classicFlip: true,
    multipleChoice: false,
    typeAnswer: false
  })
  const [includeImages, setIncludeImages] = useState(false)
  const [difficulty, setDifficulty] = useState('mixed')
  const [frontLanguage, setFrontLanguage] = useState('')
  const [backLanguage, setBackLanguage] = useState('')
  const [generateAudio, setGenerateAudio] = useState(false)
  const [loading, setLoading] = useState(false)

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfNumCards, setPdfNumCards] = useState('15')
  const [pdfCustomInstructions, setPdfCustomInstructions] = useState('')
  const [pdfCardTypes, setPdfCardTypes] = useState({
    classicFlip: true,
    multipleChoice: false,
    typeAnswer: false
  })
  const [pdfLoading, setPdfLoading] = useState(false)

  // Generated cards state
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [editOptions, setEditOptions] = useState<string[]>([])
  const [editAcceptedAnswers, setEditAcceptedAnswers] = useState<string[]>([])
  const [editFrontAudio, setEditFrontAudio] = useState<string | undefined>(undefined)
  const [editBackAudio, setEditBackAudio] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [generatingStatus, setGeneratingStatus] = useState('')

  // Get the current deck if navigated from deck detail
  const currentDeck = decks.find(d => d.id === selectedDeckId)
  const backButtonText = currentDeck ? 'Back to Deck' : 'Back to Decks'
  const backView = currentDeck ? 'deck-detail' : 'decks'
  
  // Check if user is on free tier
  const isFreeUser = !user?.subscriptionTier || user.subscriptionTier === 'free'

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setGeneratingStatus('Generating flashcards with AI...')
    
    try {
      // Validate card count limit
      const cardCount = parseInt(numCards)
      if (cardCount > 100) {
        toast.error('Maximum 100 cards can be generated at once')
        setLoading(false)
        setGeneratingStatus('')
        return
      }
      
      console.log('AI Generation Request:', { topic, numCards, cardTypes, difficulty, frontLanguage, backLanguage })
      const response = await api.generateCardsWithAI(topic, cardCount, cardTypes, includeImages, difficulty, frontLanguage, backLanguage)
      
      if (response.cards && response.cards.length > 0) {
        // DEBUG: Check if any cards have note fields
        const cardsWithNotes = response.cards.filter((c: any) => c.note || c.notes)
        if (cardsWithNotes.length > 0) {
          console.warn('⚠️ WARNING: OpenAI generated cards with note fields:', cardsWithNotes)
        }
        
        // Process cards to detect and generate audio for musical notes/chords (only if enabled)
        if (generateAudio) {
          setGeneratingStatus('Processing audio for musical content...')
        }
        const processedCards = generateAudio ? await processCardsWithAudio(response.cards) : response.cards
        setGeneratedCards(processedCards)
        toast.success(`Generated ${processedCards.length} flashcards!`)
      } else {
        toast.error('No cards were generated. Please try again.')
      }
    } catch (error) {
      console.error('AI generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('Premium') || errorMessage.includes('subscription')) {
        toast.error('AI generation requires a Premium or Pro subscription')
      } else if (errorMessage.includes('API key')) {
        toast.error('AI service not configured. Please contact support.')
      } else {
        toast.error(errorMessage || 'Failed to generate cards')
      }
    } finally {
      setLoading(false)
      setGeneratingStatus('')
    }
  }
  
  // Process cards to detect musical content and generate audio
  const processCardsWithAudio = async (cards: GeneratedCard[]): Promise<GeneratedCard[]> => {
    const processedCards = await Promise.all(cards.map(async (card) => {
      try {
        // Check if the card front or back contains a musical note/chord request
        const frontRequest = audioSynthesis.parseMusicRequest(card.front)
        const backRequest = audioSynthesis.parseMusicRequest(card.back)
        
        let frontAudio: string | undefined
        let backAudio: string | undefined
        
        // Generate audio for front if detected
        if (frontRequest) {
          console.log(`Detected music in front: ${card.front}`, frontRequest)
          const audioBlob = await audioSynthesis.generateAudioFile(card.front, 2)
          if (audioBlob && accessToken) {
            // Upload to Supabase storage
            const audioUrl = await uploadAudioToStorage(audioBlob, `generated-${Date.now()}-front.wav`)
            if (audioUrl) {
              frontAudio = audioUrl
              console.log(`Generated and uploaded audio for front: ${audioUrl}`)
            }
          }
        }
        
        // Generate audio for back if detected
        if (backRequest) {
          console.log(`Detected music in back: ${card.back}`, backRequest)
          const audioBlob = await audioSynthesis.generateAudioFile(card.back, 2)
          if (audioBlob && accessToken) {
            // Upload to Supabase storage
            const audioUrl = await uploadAudioToStorage(audioBlob, `generated-${Date.now()}-back.wav`)
            if (audioUrl) {
              backAudio = audioUrl
              console.log(`Generated and uploaded audio for back: ${audioUrl}`)
            }
          }
        }
        
        return {
          ...card,
          frontAudio,
          backAudio
        }
      } catch (error) {
        console.error('Error processing card audio:', error)
        return card
      }
    }))
    
    return processedCards
  }
  
  // Upload audio blob to Supabase storage
  const uploadAudioToStorage = async (audioBlob: Blob, filename: string): Promise<string | null> => {
    try {
      if (!accessToken) return null
      
      // Convert blob to file
      const audioFile = new File([audioBlob], filename, { type: 'audio/wav' })
      
      // Use the existing API function to upload audio
      const audioUrl = await api.uploadCardAudio(audioFile)
      
      if (audioUrl) {
        return audioUrl
      }
      return null
    } catch (error) {
      console.error('Error uploading generated audio:', error)
      return null
    }
  }

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return
    
    setCsvLoading(true)
    
    try {
      const session = await api.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      const response = await api.generateCardsFromCSV(session.access_token, csvFile)
      
      if (response.cards && response.cards.length > 0) {
        setGeneratedCards(response.cards)
        toast.success(`Imported ${response.cards.length} flashcards!`)
      } else {
        toast.error('No cards were found in the CSV file.')
      }
    } catch (error) {
      console.error('CSV import error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to import CSV'
      toast.error(errorMessage)
    } finally {
      setCsvLoading(false)
    }
  }

  const handlePDFUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdfFile) return
    
    setPdfLoading(true)
    setGeneratingStatus('Processing PDF and generating flashcards...')
    
    try {
      // Validate card count limit
      const cardCount = parseInt(pdfNumCards)
      if (cardCount > 100) {
        toast.error('Maximum 100 cards can be generated at once')
        setPdfLoading(false)
        setGeneratingStatus('')
        return
      }
      
      const response = await api.generateCardsFromPDF(pdfFile, cardCount, pdfCustomInstructions, pdfCardTypes)
      
      if (response.cards && response.cards.length > 0) {
        setGeneratedCards(response.cards)
        toast.success(`Generated ${response.cards.length} flashcards!`)
      } else if (response.error) {
        toast.error(response.error)
      } else {
        toast.error('Failed to process PDF. Please try using AI Chat with extracted text.')
      }
    } catch (error) {
      console.error('PDF import error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('Premium') || errorMessage.includes('subscription')) {
        toast.error('PDF import requires a Premium or Pro subscription')
      } else {
        toast.error(errorMessage || 'Failed to process PDF. Try using AI Chat instead.')
      }
    } finally {
      setPdfLoading(false)
      setGeneratingStatus('')
    }
  }

  const handleRemoveCard = (index: number) => {
    setGeneratedCards(prev => prev.filter((_, i) => i !== index))
    toast.success('Card removed')
  }

  const handleEditCard = (index: number) => {
    const card = generatedCards[index]
    setEditingIndex(index)
    setEditFront(card.front)
    setEditBack(card.back)
    setEditOptions(card.options || [])
    setEditAcceptedAnswers(card.acceptedAnswers || [])
    setEditFrontAudio(card.frontAudio)
    setEditBackAudio(card.backAudio)
  }

  const handleSaveEdit = () => {
    if (editingIndex === null) return
    
    const originalCard = generatedCards[editingIndex]
    setGeneratedCards(prev => prev.map((card, i) => 
      i === editingIndex ? { 
        ...originalCard,
        front: editFront, 
        back: editBack, 
        options: editOptions, 
        acceptedAnswers: editAcceptedAnswers,
        frontAudio: editFrontAudio,
        backAudio: editBackAudio
      } : card
    ))
    setEditingIndex(null)
    toast.success('Card updated')
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
  }

  const handleSaveAllCards = async () => {
    if (!selectedDeckId) {
      toast.error('Please select a deck first')
      return
    }

    if (!accessToken) {
      toast.error('You must be logged in to save cards')
      return
    }

    if (generatedCards.length === 0) {
      toast.error('No cards to save')
      return
    }

    setSaving(true)
    try {
      // Prepare all cards for batch creation
      const cardsToSave = generatedCards.map(card => {
        const cardData: {
          front: string
          back: string
          cardType: string
          options?: string[]
          acceptedAnswers?: string[]
          frontAudio?: string
          backAudio?: string
        } = {
          front: card.front,
          back: card.back,
          cardType: card.cardType || 'classic-flip'
        }
        
        // Add options for multiple-choice cards
        if (card.cardType === 'multiple-choice' && card.options) {
          cardData.options = card.options
        }
        
        // Add accepted answers for type-answer cards
        if (card.cardType === 'type-answer' && card.acceptedAnswers) {
          cardData.acceptedAnswers = card.acceptedAnswers
        }
        
        // Add audio URLs if present
        if (card.frontAudio) {
          cardData.frontAudio = card.frontAudio
        }
        if (card.backAudio) {
          cardData.backAudio = card.backAudio
        }
        
        return cardData
      })
      
      // Use batch API for much faster saving
      const newCards = await api.createCardsBatch(accessToken, selectedDeckId, cardsToSave)
      
      // Add all cards to store
      newCards.forEach(card => addCard(card))
      
      // Update deck card count
      if (currentDeck) {
        updateDeck(currentDeck.id, { cardCount: (currentDeck.cardCount || 0) + newCards.length })
      }
      
      toast.success(`Saved ${newCards.length} cards to ${currentDeck?.name || 'deck'}`)
      
      // Reset state and navigate back
      setGeneratedCards([])
      setTopic('')
      setCsvFile(null)
      setPdfFile(null)
      
      navigateTo('deck-detail')
    } catch (error) {
      console.error('Error saving cards:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save cards'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardCards = () => {
    setGeneratedCards([])
    toast.success('Cards discarded')
  }

  // Show review screen if we have generated cards
  if (generatedCards.length > 0) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleDiscardCards}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Generator
            </Button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl text-gray-900 dark:text-gray-100">Review Generated Cards</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{generatedCards.length} cards ready to save</p>
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Button
                    variant="outline"
                    onClick={handleDiscardCards}
                    disabled={saving}
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 flex-1 sm:flex-none whitespace-nowrap"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Discard All
                  </Button>
                  <Button
                    onClick={handleSaveAllCards}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none whitespace-nowrap"
                  >
                    {saving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save to {currentDeck?.name || 'Deck'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {generatedCards.map((card, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-600 dark:text-gray-400">Front</Label>
                          <Textarea
                            value={editFront}
                            onChange={(e) => setEditFront(e.target.value)}
                            className="mt-1 min-h-[60px] bg-white dark:bg-gray-800"
                          />
                        </div>
                        
                        {card.cardType === 'multiple-choice' ? (
                          <>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">Correct Answer</Label>
                              <Textarea
                                value={editBack}
                                onChange={(e) => setEditBack(e.target.value)}
                                className="mt-1 min-h-[60px] bg-white dark:bg-gray-800"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">Incorrect Options</Label>
                              <div className="space-y-2 mt-1">
                                {editOptions.map((option, optIdx) => (
                                  <div key={optIdx} className="flex gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...editOptions]
                                        newOptions[optIdx] = e.target.value
                                        setEditOptions(newOptions)
                                      }}
                                      placeholder={`Option ${optIdx + 1}`}
                                      className="bg-white dark:bg-gray-800"
                                    />
                                    {editOptions.length > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const newOptions = editOptions.filter((_, i) => i !== optIdx)
                                          setEditOptions(newOptions)
                                        }}
                                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditOptions([...editOptions, ''])}
                                  className="w-full"
                                >
                                  Add Option
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : card.cardType === 'type-answer' ? (
                          <>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">Correct Answer</Label>
                              <Textarea
                                value={editBack}
                                onChange={(e) => setEditBack(e.target.value)}
                                className="mt-1 min-h-[60px] bg-white dark:bg-gray-800"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">
                                Alternative Accepted Answers <span className="text-gray-500">(optional)</span>
                              </Label>
                              <div className="space-y-2 mt-1">
                                {editAcceptedAnswers.map((answer, ansIdx) => (
                                  <div key={ansIdx} className="flex gap-2">
                                    <Input
                                      value={answer}
                                      onChange={(e) => {
                                        const newAnswers = [...editAcceptedAnswers]
                                        newAnswers[ansIdx] = e.target.value
                                        setEditAcceptedAnswers(newAnswers)
                                      }}
                                      placeholder={`Alternative answer ${ansIdx + 1}`}
                                      className="bg-white dark:bg-gray-800"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newAnswers = editAcceptedAnswers.filter((_, i) => i !== ansIdx)
                                        setEditAcceptedAnswers(newAnswers)
                                      }}
                                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditAcceptedAnswers([...editAcceptedAnswers, ''])}
                                  className="w-full"
                                >
                                  Add Alternative Answer
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Back</Label>
                            <Textarea
                              value={editBack}
                              onChange={(e) => setEditBack(e.target.value)}
                              className="mt-1 min-h-[60px] bg-white dark:bg-gray-800"
                            />
                          </div>
                        )}
                        
                        {/* Audio Management */}
                        {(editFrontAudio || editBackAudio) && (
                          <div className="space-y-2">
                            {editFrontAudio && (
                              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs text-blue-700 dark:text-blue-300 flex-1">Front audio attached</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditFrontAudio(undefined)}
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                            {editBackAudio && (
                              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs text-blue-700 dark:text-blue-300 flex-1">Back audio attached</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditBackAudio(undefined)}
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Check className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Card {index + 1}</span>
                            {card.cardType === 'multiple-choice' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                Multiple Choice
                              </span>
                            )}
                            {card.cardType === 'type-answer' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                Type Answer
                              </span>
                            )}
                            {card.cardType === 'classic-flip' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                Classic Flip
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCard(index)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveCard(index)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Front:</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">{card.front}</div>
                            {card.frontAudio && (
                              <div className="mt-2">
                                <audio controls className="w-full max-w-md h-8">
                                  <source src={card.frontAudio} type="audio/wav" />
                                  <source src={card.frontAudio} type="audio/mpeg" />
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}
                          </div>
                          <div className="h-px bg-gray-200 dark:bg-gray-600" />
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Back:</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">{card.back}</div>
                            {card.backAudio && (
                              <div className="mt-2">
                                <audio controls className="w-full max-w-md h-8">
                                  <source src={card.backAudio} type="audio/wav" />
                                  <source src={card.backAudio} type="audio/mpeg" />
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}
                          </div>
                          {card.cardType === 'multiple-choice' && card.options && card.options.length > 0 && (
                            <>
                              <div className="h-px bg-gray-200 dark:bg-gray-600" />
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Incorrect Options:</div>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                                  {card.options.map((option, optIdx) => (
                                    <li key={optIdx}>{option}</li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}
                          {card.cardType === 'type-answer' && card.acceptedAnswers && card.acceptedAnswers.length > 0 && (
                            <>
                              <div className="h-px bg-gray-200 dark:bg-gray-600" />
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Accepted Answers:</div>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                                  {card.acceptedAnswers.map((answer, ansIdx) => (
                                    <li key={ansIdx}>{answer}</li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}
                          {/* DEBUG: Show if note field exists */}
                          {card.note && (
                            <>
                              <div className="h-px bg-gray-200 dark:bg-gray-600" />
                              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                                <div className="text-xs text-red-600 dark:text-red-400 mb-1 font-semibold">⚠️ Unexpected Note Field (will not be saved):</div>
                                <div className="text-sm text-red-700 dark:text-red-300">{card.note}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Loading Overlay */}
      {(loading || pdfLoading || csvLoading) && generatingStatus && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {generatingStatus}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This may take a moment...
                </p>
              </div>
              {/* Loading spinner */}
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigateTo(backView as any)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backButtonText}
          </Button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl text-gray-900 dark:text-gray-100">AI Deck Generator</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Create flashcards with AI or upload files</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Chat</span>
                  <span className="sm:hidden">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">CSV</span>
                  <span className="sm:hidden">CSV</span>
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                  <span className="sm:hidden">PDF</span>
                </TabsTrigger>
              </TabsList>

              {/* Free User Warning Banner */}
              {isFreeUser && (
                <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500 dark:bg-amber-600 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Premium Feature
                      </h3>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
                        AI card generation is available exclusively for Premium and Pro subscribers. Upgrade to unlock AI-powered flashcard creation with customizable difficulty levels and card types.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigateTo('upgrade')}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white h-8"
                      >
                        <Crown className="w-4 h-4 mr-1.5" />
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Chat Tab */}
              <TabsContent value="chat">
                <form onSubmit={handleAIGenerate} className="space-y-6">
                  <div>
                    <Label htmlFor="topic">Topic or Subject</Label>
                    <Textarea
                      id="topic"
                      placeholder="E.g., 'Spanish verbs', 'World War 2 dates', 'Python functions'..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                      className="mt-1 min-h-[100px] bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Describe what you want to learn. Be as specific as possible for better results.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="numCards">Number of Cards</Label>
                    <Input
                      id="numCards"
                      type="number"
                      min="1"
                      max="100"
                      value={numCards}
                      onChange={(e) => setNumCards(e.target.value)}
                      required
                      className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Generate between 1-100 cards per request
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="difficulty" className="text-gray-700 dark:text-gray-300">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue placeholder="Select difficulty..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">🟢 Beginner - Simple concepts and definitions</SelectItem>
                        <SelectItem value="intermediate">🟡 Intermediate - Moderate complexity</SelectItem>
                        <SelectItem value="advanced">🟠 Advanced - Complex concepts and applications</SelectItem>
                        <SelectItem value="expert">🔴 Expert - Mastery-level knowledge</SelectItem>
                        <SelectItem value="mixed">🌈 Mixed - Progressive difficulty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm text-blue-900 dark:text-blue-300 mb-2">💡 Pro Tips:</h3>
                    <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• Be specific about the difficulty level</li>
                      <li>• Include context (e.g., "for beginners", "advanced level")</li>
                      <li>• Mention the format you prefer</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          Music & Sound Generation
                        </h3>
                        <p className="text-xs text-indigo-800 dark:text-indigo-400 mb-2">
                          You can now request musical notes and chords! Just type your request naturally:
                        </p>
                        <ul className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1">
                          <li>• "Play an A note" or "Generate C# note"</li>
                          <li>• "C major chord" or "D minor chord"</li>
                          <li>• "G5 note" (specify octave) or "E major"</li>
                          <li>• Supported chords: major, minor, diminished, augmented, sus2, sus4</li>
                        </ul>
                        <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-2 italic">
                          Sounds will play instantly and be saved to your cards!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <p className="text-xs text-purple-800 dark:text-purple-400">
                      ⚡ Requires Premium or Pro subscription
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Card Types</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="classicFlip"
                        checked={cardTypes.classicFlip}
                        onChange={(e) => {
                          // Prevent unchecking if it's the only one selected
                          if (!e.target.checked && !cardTypes.multipleChoice && !cardTypes.typeAnswer) {
                            return
                          }
                          setCardTypes({ ...cardTypes, classicFlip: e.target.checked })
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="classicFlip" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        Classic Flip
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="multipleChoice"
                        checked={cardTypes.multipleChoice}
                        onChange={(e) => {
                          // Prevent unchecking if it's the only one selected
                          if (!e.target.checked && !cardTypes.classicFlip && !cardTypes.typeAnswer) {
                            return
                          }
                          setCardTypes({ ...cardTypes, multipleChoice: e.target.checked })
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="multipleChoice" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        Multiple Choice
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="typeAnswer"
                        checked={cardTypes.typeAnswer}
                        onChange={(e) => {
                          // Prevent unchecking if it's the only one selected
                          if (!e.target.checked && !cardTypes.classicFlip && !cardTypes.multipleChoice) {
                            return
                          }
                          setCardTypes({ ...cardTypes, typeAnswer: e.target.checked })
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="typeAnswer" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        Type Answer
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      Select one or more card types (at least one required). Multiple types will be mixed evenly.
                    </p>
                    <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                      <input
                        type="checkbox"
                        id="includeImages"
                        checked={includeImages}
                        onChange={(e) => setIncludeImages(e.target.checked)}
                        disabled
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="includeImages" className="text-sm text-gray-500 dark:text-gray-500">
                        Generate images (Coming soon - uses DALL-E)
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="generateAudio"
                        checked={generateAudio}
                        onChange={(e) => setGenerateAudio(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <label htmlFor="generateAudio" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-1">
                        <Music className="w-4 h-4" />
                        Generate audio for musical notes/chords
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">
                      Automatically detects and generates audio playback for musical content (e.g., "C major chord", "A4 note")
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Language Settings (Optional)</Label>
                    
                    <div>
                      <Label htmlFor="frontLanguage" className="text-xs text-gray-600 dark:text-gray-400">Front Language (Question)</Label>
                      <Select value={frontLanguage} onValueChange={setFrontLanguage}>
                        <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 dark:border-gray-600">
                          <SelectValue placeholder="Select language for questions..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DECK_LANGUAGES.map(lang => (
                            <SelectItem key={lang.code} value={lang.name}>
                              {lang.flag} {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Language for the front/question side (e.g., English, Spanish)
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="backLanguage" className="text-xs text-gray-600 dark:text-gray-400">Back Language (Answer)</Label>
                      <Select value={backLanguage} onValueChange={setBackLanguage}>
                        <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 dark:border-gray-600">
                          <SelectValue placeholder="Select language for answers..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DECK_LANGUAGES.map(lang => (
                            <SelectItem key={lang.code} value={lang.name}>
                              {lang.flag} {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Language for the back/answer side (e.g., Spanish, English)
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12"
                  >
                    {loading ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* CSV Upload Tab */}
              <TabsContent value="csv">
                <form onSubmit={handleCSVUpload} className="space-y-6">
                  <div>
                    <Label htmlFor="csv-upload">Upload CSV File</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="csv-upload"
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">CSV file with "Front" and "Back" columns</p>
                          {csvFile && (
                            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                              Selected: {csvFile.name}
                            </p>
                          )}
                        </div>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <h3 className="text-sm text-emerald-900 dark:text-emerald-300 mb-2">📊 CSV Format:</h3>
                    <div className="text-xs text-emerald-800 dark:text-emerald-400 space-y-3">
                      <div>
                        <p className="font-semibold mb-1">Classic Flip Cards (default):</p>
                        <ul className="space-y-1 ml-2">
                          <li>• Headers: <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">Front,Back</code></li>
                          <li>• Example: What is 2+2?,4</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Multiple Choice Cards:</p>
                        <ul className="space-y-1 ml-2">
                          <li>• Headers: <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">Question,Correct,Incorrect</code></li>
                          <li>• Incorrect: Wrong answers separated by semicolon</li>
                          <li>• Example: What is 2+2?,4,3;5;6</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Type Answer Cards:</p>
                        <ul className="space-y-1 ml-2">
                          <li>• Headers: <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">Question,Answer,Accepted Answers</code></li>
                          <li>• Accepted Answers: Alternative answers separated by semicolon (optional)</li>
                          <li>• Example: Capital of France?,Paris,paris;PARIS</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!csvFile || csvLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-12"
                  >
                    {csvLoading ? (
                      <>Importing...</>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-5 h-5 mr-2" />
                        Import from CSV
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* PDF Upload Tab */}
              <TabsContent value="pdf">
                <form onSubmit={handlePDFUpload} className="space-y-6">
                  <div>
                    <Label htmlFor="pdf-upload">Upload PDF File</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="pdf-upload"
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PDF document (Max 10MB)</p>
                          {pdfFile && (
                            <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                              Selected: {pdfFile.name}
                            </p>
                          )}
                        </div>
                        <input
                          id="pdf-upload"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pdf-numCards">Number of Cards to Generate</Label>
                    <Input
                      id="pdf-numCards"
                      type="number"
                      min="1"
                      max="100"
                      value={pdfNumCards}
                      onChange={(e) => setPdfNumCards(e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Generate between 1-100 cards per request
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pdf-customInstructions">Custom Instructions (Optional)</Label>
                    <Textarea
                      id="pdf-customInstructions"
                      placeholder="E.g., 'Focus on key concepts', 'Include examples'..."
                      value={pdfCustomInstructions}
                      onChange={(e) => setPdfCustomInstructions(e.target.value)}
                      className="mt-1 min-h-[60px] bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Provide additional instructions for the AI to follow when generating cards from the PDF.
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm text-blue-900 dark:text-blue-300 mb-2">📄 How it works:</h3>
                    <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• AI will extract text content from your PDF</li>
                      <li>• Key concepts and definitions will be identified</li>
                      <li>• Flashcards will be automatically generated</li>
                      <li>• You can review and edit before saving</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <p className="text-xs text-purple-800 dark:text-purple-400">
                      ⚡ Requires Premium or Pro subscription
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-xs text-blue-800 dark:text-blue-400">
                      📄 Upload a PDF and AI will automatically extract text and generate flashcards. Max file size: 10MB.
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Card Types</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pdf-classicFlip"
                        checked={pdfCardTypes.classicFlip}
                        onChange={(e) => {
                          // Prevent unchecking if it's the only one selected
                          if (!e.target.checked && !pdfCardTypes.multipleChoice && !pdfCardTypes.typeAnswer) {
                            return
                          }
                          setPdfCardTypes({ ...pdfCardTypes, classicFlip: e.target.checked })
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="pdf-classicFlip" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        Classic Flip
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pdf-multipleChoice"
                        checked={pdfCardTypes.multipleChoice}
                        onChange={(e) => {
                          // Prevent unchecking if it's the only one selected
                          if (!e.target.checked && !pdfCardTypes.classicFlip && !pdfCardTypes.typeAnswer) {
                            return
                          }
                          setPdfCardTypes({ ...pdfCardTypes, multipleChoice: e.target.checked })
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="pdf-multipleChoice" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        Multiple Choice
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pdf-typeAnswer"
                        checked={pdfCardTypes.typeAnswer}
                        onChange={(e) => {
                          // Prevent unchecking if it's the only one selected
                          if (!e.target.checked && !pdfCardTypes.classicFlip && !pdfCardTypes.multipleChoice) {
                            return
                          }
                          setPdfCardTypes({ ...pdfCardTypes, typeAnswer: e.target.checked })
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="pdf-typeAnswer" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        Type Answer
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      Select one or more card types (at least one required). Multiple types will be mixed evenly.
                    </p>
                    <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                      <input
                        type="checkbox"
                        id="includeImages"
                        checked={includeImages}
                        onChange={(e) => setIncludeImages(e.target.checked)}
                        disabled
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="includeImages" className="text-sm text-gray-500 dark:text-gray-500">
                        Generate images (Coming soon - uses DALL-E)
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!pdfFile || pdfLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12"
                  >
                    {pdfLoading ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 mr-2" />
                        Generate from PDF
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}