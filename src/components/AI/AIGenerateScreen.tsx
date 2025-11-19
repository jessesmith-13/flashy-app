import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import * as api from '../../../utils/api'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Sparkles, ArrowLeft, MessageSquare, FileText, FileSpreadsheet, Upload, Check, X, Edit2, Crown, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface GeneratedCard {
  front: string
  back: string
  cardType?: string
  options?: string[]
  acceptedAnswers?: string[]
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
  const [loading, setLoading] = useState(false)

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfNumCards, setPdfNumCards] = useState('15')
  const [pdfLoading, setPdfLoading] = useState(false)

  // Generated cards state
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [editOptions, setEditOptions] = useState<string[]>([])
  const [editAcceptedAnswers, setEditAcceptedAnswers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Get the current deck if navigated from deck detail
  const currentDeck = decks.find(d => d.id === selectedDeckId)
  const backButtonText = currentDeck ? 'Back to Deck' : 'Back to Decks'
  const backView = currentDeck ? 'deck-detail' : 'decks'
  
  // Check if user is on free tier
  const isFreeUser = !user?.subscriptionTier || user.subscriptionTier === 'free'

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      console.log('AI Generation Request:', { topic, numCards, cardTypes, difficulty })
      const response = await api.generateCardsWithAI(topic, parseInt(numCards), cardTypes, includeImages, difficulty)
      
      if (response.cards && response.cards.length > 0) {
        setGeneratedCards(response.cards)
        toast.success(`Generated ${response.cards.length} flashcards!`)
      } else {
        toast.error('No cards were generated. Please try again.')
      }
    } catch (error: any) {
      console.error('AI generation error:', error)
      if (error.message.includes('Premium') || error.message.includes('subscription')) {
        toast.error('AI generation requires a Premium or Pro subscription')
      } else if (error.message.includes('API key')) {
        toast.error('AI service not configured. Please contact support.')
      } else {
        toast.error(error.message || 'Failed to generate cards')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return
    
    setCsvLoading(true)
    
    try {
      const response = await api.importCardsFromCSV(csvFile)
      
      if (response.cards && response.cards.length > 0) {
        setGeneratedCards(response.cards)
        toast.success(`Imported ${response.cards.length} flashcards!`)
      } else {
        toast.error('No cards were found in the CSV file.')
      }
    } catch (error: any) {
      console.error('CSV import error:', error)
      toast.error(error.message || 'Failed to import CSV')
    } finally {
      setCsvLoading(false)
    }
  }

  const handlePDFUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdfFile) return
    
    setPdfLoading(true)
    
    try {
      const response = await api.generateCardsFromPDF(pdfFile, parseInt(pdfNumCards))
      
      if (response.cards && response.cards.length > 0) {
        setGeneratedCards(response.cards)
        toast.success(`Generated ${response.cards.length} flashcards!`)
      } else if (response.error) {
        toast.error(response.error)
      } else {
        toast.error('Failed to process PDF. Please try using AI Chat with extracted text.')
      }
    } catch (error: any) {
      console.error('PDF import error:', error)
      if (error.message.includes('Premium') || error.message.includes('subscription')) {
        toast.error('PDF import requires a Premium or Pro subscription')
      } else {
        toast.error(error.message || 'Failed to process PDF. Try using AI Chat instead.')
      }
    } finally {
      setPdfLoading(false)
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
        acceptedAnswers: editAcceptedAnswers 
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
      // Save all cards to the selected deck
      let savedCount = 0
      for (const card of generatedCards) {
        const cardData: any = {
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
        
        const newCard = await api.createCard(accessToken, selectedDeckId, cardData)
        addCard(newCard)
        savedCount++
      }
      
      // Update deck card count
      if (currentDeck) {
        updateDeck(currentDeck.id, { cardCount: (currentDeck.cardCount || 0) + savedCount })
      }
      
      toast.success(`Saved ${savedCount} cards to ${currentDeck?.name || 'deck'}`)
      
      // Reset state and navigate back
      setGeneratedCards([])
      setTopic('')
      setCsvFile(null)
      setPdfFile(null)
      
      navigateTo('deck-detail')
    } catch (error: any) {
      console.error('Error saving cards:', error)
      toast.error(error.message || 'Failed to save cards')
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

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl text-gray-900 dark:text-gray-100">Review Generated Cards</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{generatedCards.length} cards ready to save</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDiscardCards}
                    disabled={saving}
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Discard All
                  </Button>
                  <Button
                    onClick={handleSaveAllCards}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div>
                          <Label className="text-xs text-gray-600 dark:text-gray-400">Back</Label>
                          <Textarea
                            value={editBack}
                            onChange={(e) => setEditBack(e.target.value)}
                            className="mt-1 min-h-[60px] bg-white dark:bg-gray-800"
                          />
                        </div>
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
                          </div>
                          <div className="h-px bg-gray-200 dark:bg-gray-600" />
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Back:</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">{card.back}</div>
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
                      min="5"
                      max="50"
                      value={numCards}
                      onChange={(e) => setNumCards(e.target.value)}
                      required
                      className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
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
                    <ul className="text-xs text-emerald-800 dark:text-emerald-400 space-y-1">
                      <li>• First row should contain headers: "Front" and "Back"</li>
                      <li>• Each subsequent row creates one flashcard</li>
                      <li>• Example: Front,Back</li>
                      <li className="ml-4">What is 2+2?,4</li>
                    </ul>
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
                      min="5"
                      max="50"
                      value={pdfNumCards}
                      onChange={(e) => setPdfNumCards(e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
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

                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-xs text-yellow-800 dark:text-yellow-400">
                      ⚠️ PDF parsing is currently in beta. For best results, use AI Chat with extracted text or CSV import.
                    </p>
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