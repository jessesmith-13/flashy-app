import { useEffect, useState } from 'react'
import { useStore } from '../../../../store/useStore'
import { CardType, UICard, UIDeck } from '@/types/decks'
import { CommunityDeck } from '@/types/community'
import { useNavigation } from '../../../../hooks/useNavigation'
import { 
  fetchCards as apiFetchCards, 
  createCard as apiCreateCard, 
  updateCard as apiUpdateCard, 
  deleteCard as apiDeleteCard, 
  updateDeck as apiUpdateDeck, 
  deleteDeck as apiDeleteDeck, 
  updateCardPositions as apiReorderCard, 
  createCardsBatch as apiCreateCardsBatch,
} from '../../../../utils/api/decks'
import { translateText as apiTranslateText } from '../../../../utils/api/ai'
import { 
  fetchCommunityDecks as apiFetchCommunityDecks, 
  publishDeck as apiPublishDeck, 
  unpublishDeck as apiUnpublishDeck 
} from '../../../../utils/api/community'
import { 
  uploadCardImage as apiUploadCardImage, 
  uploadCardAudio as apiUploadCardAudio 
} from '../../../../utils/api/storage'
import { AppLayout } from '../../Layout/AppLayout'
import { DeckHeader } from './DeckHeader'
import { AddCardModal  } from './AddCardModal'
import { EditCardModal } from './EditCardModal'
import { BulkAddCardsDialog } from './BulkAddCardsDialog'
import { DeckSettingsDialog } from './DeckSettingsDialog'
import { PublishDeckDialog } from './PublishDeckDialog'
import { CardList } from './CardList'
import { UpgradeModal } from '../../UpgradeModal'
import { toast } from 'sonner'
import { canPublishToCommunity } from '../../../../utils/subscription'
import { handleAuthError } from '../../../../utils/authErrorHandler'

interface CardData {
  id?: string
  front: string
  back?: string
  cardType: string
  frontImageUrl?: string | null
  backImageUrl?: string | null
  frontAudio?: string | null
  backAudio?: string | null
  correctAnswers?: string[]
  acceptedAnswers?: string[]
  incorrectAnswers?: string[]
}

interface ApiCardData {
  front: string
  back?: string
  cardType: string
  frontImageUrl?: string
  backImageUrl?: string
  frontAudio?: string
  backAudio?: string
  acceptedAnswers?: string[]
  correctAnswers?: string[]
  incorrectAnswers?: string[]
}

export function DeckDetailScreen() {
  const {
    user,
    accessToken,
    selectedDeckId,
    decks,
    cards,
    setCards,
    addCard,
    updateCard,
    removeCard,
    removeDeck,
    updateDeck,
    studySessions,
  } = useStore()
  const { navigateTo } = useNavigation()
  
  const deck = decks.find((d) => d.id === selectedDeckId)
  const deckCards = cards.filter((c) => c.deckId === selectedDeckId)

  // Calculate study statistics for this deck
  const deckStudySessions = selectedDeckId ? studySessions.filter(s => s.deckId === selectedDeckId) : []
  const studyCount = deckStudySessions.length
  const averageScore = studyCount > 0 
    ? deckStudySessions.reduce((sum, session) => sum + session.score, 0) / studyCount
    : undefined

  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editCardDialogOpen, setEditCardDialogOpen] = useState(false)
  
  // New card state - matching new API structure
  const [newCardType, setNewCardType] = useState<CardType>('classic-flip')
  const [newCardFront, setNewCardFront] = useState('')
  const [newCardBack, setNewCardBack] = useState('')
  const [newCardFrontImageUrl, setNewCardFrontImageUrl] = useState('')
  const [newCardImageFile, setNewCardImageFile] = useState<File | null>(null)
  const [newCardBackImageUrl, setNewCardBackImageUrl] = useState('')
  const [newCardBackImageFile, setNewCardBackImageFile] = useState<File | null>(null)
  const [newCardFrontAudio, setNewCardFrontAudio] = useState('')
  const [newCardBackAudio, setNewCardBackAudio] = useState('')
  
  // New API structure for multiple-choice
  const [newCardCorrectAnswers, setNewCardCorrectAnswers] = useState<string[]>([''])
  const [newCardIncorrectAnswers, setNewCardIncorrectAnswers] = useState<string[]>(['', '', ''])
  
  // New API structure for type-answer
  const [newCardAcceptedAnswers, setNewCardAcceptedAnswers] = useState<string[]>([])
  
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBackImage, setUploadingBackImage] = useState(false)

  const [uploadingEditImage, setUploadingEditImage] = useState(false)
  const [uploadingEditBackImage, setUploadingEditBackImage] = useState(false)

  const [translatingFront, setTranslatingFront] = useState(false)
  const [translatingBack, setTranslatingBack] = useState(false)
  const [translatingEditFront, setTranslatingEditFront] = useState(false)
  const [translatingEditBack, setTranslatingEditBack] = useState(false)

  // Edit card state - matching new API structure
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editCardType, setEditCardType] = useState<CardType>('classic-flip')
  const [editCardFront, setEditCardFront] = useState('')
  const [editCardBack, setEditCardBack] = useState('')
  const [editCardFrontImageUrl, setEditCardFrontImageUrl] = useState('')
  const [editCardImageFile, setEditCardImageFile] = useState<File | null>(null)
  const [editCardBackImageUrl, setEditCardBackImageUrl] = useState('')
  const [editCardBackImageFile, setEditCardBackImageFile] = useState<File | null>(null)
  const [editCardFrontAudio, setEditCardFrontAudio] = useState('')
  const [editCardBackAudio, setEditCardBackAudio] = useState('')
  
  // New API structure for edit - multiple-choice
  const [editCardAcceptedAnswers, setEditCardAcceptedAnswers] = useState<string[]>([''])
  const [editCardIncorrectAnswers, setEditCardIncorrectAnswers] = useState<string[]>(['', '', ''])
  
  // New API structure for edit - type-answer
  const [editCardTypeAnswerAcceptedAnswers, setEditCardTypeAnswerAcceptedAnswers] = useState<string[]>([''])
  const [editCardCorrectAnswers, setEditCardCorrectAnswers] = useState<string[]>([''])
  
  const [updating, setUpdating] = useState(false)
  
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSubtopic, setEditSubtopic] = useState('')
  const [editDifficulty, setEditDifficulty] = useState('')
  const [editFrontLanguage, setEditFrontLanguage] = useState('')
  const [editBackLanguage, setEditBackLanguage] = useState('')
  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  const [dragOverCard, setDragOverCard] = useState<string | null>(null)
  
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false)
  const [communityDeckAuthor, setCommunityDeckAuthor] = useState<{ id: string; name: string } | null>(null)
  
  // Multi-select state
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  useEffect(() => {
    if (deck) {
      setEditName(deck.name)
      setEditEmoji(deck.emoji)
      setEditColor(deck.color)
      setEditCategory(deck.category || '')
      setEditSubtopic(deck.subtopic || '')
      setEditDifficulty(deck.difficulty || '')
      setEditFrontLanguage(deck.frontLanguage || '')
      setEditBackLanguage(deck.backLanguage || '')
      
      if (deck.sourceCommunityDeckId) {
        loadCommunityDeckAuthor(deck.sourceCommunityDeckId)
      }
    }
  }, [deck])

  useEffect(() => {
    loadCards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeckId])

  const loadCommunityDeckAuthor = async (communityDeckId: string) => {
    try {
      const publishedDecks = await apiFetchCommunityDecks()
      const allDecks = publishedDecks
      
      const communityDeck = allDecks.find((d: CommunityDeck) => d.id === communityDeckId)
      
      if (communityDeck) {
        setCommunityDeckAuthor({
          id: communityDeck.authorId,
          name: communityDeck.author
        })
      }
    } catch (error) {
      console.error('Failed to load community deck author:', error)
    }
  }

  const loadCards = async () => {
    if (!accessToken || !selectedDeckId) return

    try {
      const fetchedCards = await apiFetchCards(accessToken, selectedDeckId)
      setCards(fetchedCards)
    } catch (error) {
      handleAuthError(error)
      toast.error('Failed to load cards. Please check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCard = async (e: React.FormEvent, closeDialog: boolean = true) => {
    e.preventDefault()
    if (!accessToken || !selectedDeckId) return
    
    // Validation
    if (!newCardFront.trim() && !newCardImageFile) {
      toast.error('Please provide question text or image')
      return
    }

    if (newCardType === 'multiple-choice') {
      const filledCorrect = newCardCorrectAnswers.filter(a => a.trim())
      const filledIncorrect = newCardIncorrectAnswers.filter(a => a.trim())
      
      if (filledCorrect.length === 0) {
        toast.error('Please provide at least one correct answer')
        return
      }
      if (filledIncorrect.length === 0) {
        toast.error('Please provide at least one incorrect option')
        return
      }
    } else if (newCardType === 'classic-flip') {
      if (!newCardBack.trim() && !newCardBackImageFile) {
        toast.error('Please provide answer text or image')
        return
      }
    } else if (newCardType === 'type-answer') {
      if (!newCardBack.trim() && !newCardBackImageFile) {
        toast.error('Please provide answer text or image')
        return
      }
      // acceptedAnswers is optional for type-answer
    }

    setCreating(true)
    try {
      const cardData: UICard = {
        front: newCardFront,
        cardType: newCardType,
      }

      // Handle front image
      if (newCardImageFile && accessToken) {
        try {
          setUploadingImage(true)
          const imageUrl = await apiUploadCardImage(accessToken, newCardImageFile)
          cardData.frontImageUrl = imageUrl
          setUploadingImage(false)
        } catch (error) {
          setUploadingImage(false)
          console.error('Failed to upload card image:', error)
          toast.error('Failed to upload image')
          setCreating(false)
          return
        }
      } else if (newCardFrontImageUrl.trim()) {
        cardData.frontImageUrl = newCardFrontImageUrl.trim()
      }

      // Handle card type specific data
      if (newCardType === 'classic-flip') {
        cardData.back = newCardBack
        
        // Handle back image
        if (newCardBackImageFile && accessToken) {
          try {
            setUploadingBackImage(true)
            const backImageUrl = await apiUploadCardImage(accessToken, newCardBackImageFile)
            cardData.backImageUrl = backImageUrl
            setUploadingBackImage(false)
          } catch (error) {
            setUploadingBackImage(false)
            console.error('Failed to upload answer image:', error)
            toast.error('Failed to upload answer image')
            setCreating(false)
            return
          }
        } else if (newCardBackImageUrl.trim()) {
          cardData.backImageUrl = newCardBackImageUrl.trim()
        }
        
        // Handle audio URLs
        if (newCardFrontAudio.trim()) {
          cardData.frontAudio = newCardFrontAudio.trim()
        }
        if (newCardBackAudio.trim()) {
          cardData.backAudio = newCardBackAudio.trim()
        }
      } else if (newCardType === 'multiple-choice') {
        // Filter out empty answers - multiple-choice uses correctAnswers + incorrectAnswers
        cardData.correctAnswers = newCardCorrectAnswers.filter(a => a.trim())
        cardData.incorrectAnswers = newCardIncorrectAnswers.filter(a => a.trim())
      } else if (newCardType === 'type-answer') {
        // Filter out empty answers - type-answer requires back + acceptedAnswers
        cardData.back = newCardBack
        cardData.acceptedAnswers = newCardAcceptedAnswers.filter(a => a.trim())
        
        // Handle back image for type-answer
        if (newCardBackImageFile && accessToken) {
          try {
            setUploadingBackImage(true)
            const backImageUrl = await apiUploadCardImage(accessToken, newCardBackImageFile)
            cardData.backImageUrl = backImageUrl
            setUploadingBackImage(false)
          } catch (error) {
            setUploadingBackImage(false)
            console.error('Failed to upload answer image:', error)
            toast.error('Failed to upload answer image')
            setCreating(false)
            return
          }
        } else if (newCardBackImageUrl.trim()) {
          cardData.backImageUrl = newCardBackImageUrl.trim()
        }
      }

      // Convert to API format with correct field names
      const { correctAnswers, acceptedAnswers, incorrectAnswers, frontImageUrl, backImageUrl, frontAudio, backAudio, ...rest } = cardData
      
      const apiData: ApiCardData = {
        ...rest,
        ...(frontImageUrl !== null && frontImageUrl !== undefined ? { frontImageUrl } : {}),
        ...(backImageUrl !== null && backImageUrl !== undefined ? { backImageUrl } : {}),
        ...(frontAudio !== null && frontAudio !== undefined ? { frontAudio: frontAudio } : {}),
        ...(backAudio !== null && backAudio !== undefined ? { backAudio: backAudio } : {}),
      }
      
      // Add answer arrays with correct field names based on card type
      if (newCardType === 'multiple-choice' && correctAnswers && incorrectAnswers) {
        apiData.correctAnswers = correctAnswers
        apiData.incorrectAnswers = incorrectAnswers
      } else if (newCardType === 'type-answer' && acceptedAnswers) {
        apiData.acceptedAnswers = acceptedAnswers
      }
      
      const card = await apiCreateCard(accessToken, selectedDeckId, apiData)

      addCard(card)
      
      if (deck) {
        updateDeck(deck.id, { cardCount: (deck.cardCount || 0) + 1 })
      }

      // Reset form
      setNewCardFront('')
      setNewCardBack('')
      setNewCardFrontImageUrl('')
      setNewCardImageFile(null)
      setNewCardBackImageUrl('')
      setNewCardBackImageFile(null)
      setNewCardFrontAudio('')
      setNewCardBackAudio('')
      setNewCardAcceptedAnswers([''])
      setNewCardCorrectAnswers([''])
      setNewCardIncorrectAnswers(['', '', ''])
      
      if (closeDialog) {
        setCreateDialogOpen(false)
        toast.success('Card created successfully!')
      } else {
        toast.success('Card added! Add another card below.')
      }
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to create card:', error)
      toast.error('Failed to create card')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenEditCard = (cardId: string) => {
    const card = deckCards.find(c => c.id === cardId)
    if (!card) return

    setEditingCardId(cardId)
    setEditCardType(card.cardType)
    setEditCardFront(card.front)
    setEditCardBack(card.back || '')
    setEditCardFrontImageUrl(card.frontImageUrl || '')
    setEditCardImageFile(null)
    setEditCardBackImageUrl(card.backImageUrl || '')
    setEditCardBackImageFile(null)
    setEditCardFrontAudio(card.frontAudio || '')
    setEditCardBackAudio(card.backAudio || '')
    
    if (card.cardType === 'multiple-choice') {
      // Parse from new API structure
      const correctAnswers = card.correctAnswers || (card.correctAnswers ? card.correctAnswers : [''])
      const incorrectAnswers = card.incorrectAnswers || (card.incorrectAnswers ? card.incorrectAnswers : ['', '', ''])
      
      setEditCardCorrectAnswers(correctAnswers.length > 0 ? correctAnswers : [''])
      setEditCardIncorrectAnswers(incorrectAnswers.length > 0 ? incorrectAnswers : ['', '', ''])
    } else if (card.cardType === 'type-answer') {
      const acceptedAnswers = card.acceptedAnswers || ['']
      setEditCardTypeAnswerAcceptedAnswers(acceptedAnswers.length > 0 ? acceptedAnswers : [''])
    } else {
      // Reset to defaults for classic-flip
      setEditCardAcceptedAnswers([''])
      setEditCardIncorrectAnswers(['', '', ''])
      setEditCardTypeAnswerAcceptedAnswers([''])
    }
    
    setEditCardDialogOpen(true)
  }

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !selectedDeckId || !editingCardId) return
    
    // Validation
    if (!editCardFront.trim() && !editCardImageFile && !editCardFrontImageUrl) {
      toast.error('Please provide question text or image')
      return
    }

    if (editCardType === 'multiple-choice') {
      const filledCorrect = editCardCorrectAnswers.filter(a => a.trim())
      const filledIncorrect = editCardIncorrectAnswers.filter(a => a.trim())
      
      if (filledCorrect.length === 0) {
        toast.error('Please provide at least one correct answer')
        return
      }
      if (filledIncorrect.length === 0) {
        toast.error('Please provide at least one incorrect option')
        return
      }
    } else if (editCardType === 'classic-flip') {
      if (!editCardBack.trim() && !editCardBackImageFile && !editCardBackImageUrl) {
        toast.error('Please provide answer text or image')
        return
      }
    } else if (editCardType === 'type-answer') {
      if (!editCardBack.trim() && !editCardBackImageFile) {
        toast.error('Please provide answer text or image')
        return
      }
      const filledAnswers = editCardTypeAnswerAcceptedAnswers.filter(a => a.trim())
      if (filledAnswers.length === 0) {
        toast.error('Please provide at least one accepted answer')
        return
      }
    }

    setUpdating(true)
    try {
      const cardData: CardData = {
        id: editingCardId,
        front: editCardFront,
        cardType: editCardType,
      }

      // Handle front image
      if (editCardImageFile && accessToken) {
        try {
          setUploadingEditImage(true)
          const imageUrl = await apiUploadCardImage(accessToken, editCardImageFile)
          cardData.frontImageUrl = imageUrl
          setUploadingEditImage(false)
        } catch (error) {
          setUploadingEditImage(false)
          console.error('Failed to upload card image:', error)
          toast.error('Failed to upload image')
          setUpdating(false)
          return
        }
      } else if (editCardFrontImageUrl.trim()) {
        cardData.frontImageUrl = editCardFrontImageUrl.trim()
      } else {
        cardData.frontImageUrl = null
      }

      // Handle card type specific data
      if (editCardType === 'classic-flip') {
        cardData.back = editCardBack
        
        // Handle back image
        if (editCardBackImageFile && accessToken) {
          try {
            setUploadingEditBackImage(true)
            const backImageUrl = await apiUploadCardImage(accessToken, editCardBackImageFile)
            cardData.backImageUrl = backImageUrl
            setUploadingEditBackImage(false)
          } catch (error) {
            setUploadingEditBackImage(false)
            console.error('Failed to upload answer image:', error)
            toast.error('Failed to upload answer image')
            setUpdating(false)
            return
          }
        } else if (editCardBackImageUrl.trim()) {
          cardData.backImageUrl = editCardBackImageUrl.trim()
        } else {
          cardData.backImageUrl = null
        }
        
        // Handle audio URLs
        if (editCardFrontAudio.trim()) {
          cardData.frontAudio = editCardFrontAudio.trim()
        } else {
          cardData.frontAudio = null
        }
        
        if (editCardBackAudio.trim()) {
          cardData.backAudio = editCardBackAudio.trim()
        } else {
          cardData.backAudio = null
        }
      } else if (editCardType === 'multiple-choice') {
        // Filter out empty answers - multiple-choice uses correctAnswers + incorrectAnswers
        cardData.correctAnswers = editCardCorrectAnswers.filter(a => a.trim())
        cardData.incorrectAnswers = editCardIncorrectAnswers.filter(a => a.trim())
      } else if (editCardType === 'type-answer') {
        // Filter out empty answers - type-answer requires back + acceptedAnswers
        cardData.back = editCardBack
        cardData.acceptedAnswers = editCardTypeAnswerAcceptedAnswers.filter(a => a.trim())
        
        // Handle back image for type-answer
        if (editCardBackImageFile && accessToken) {
          try {
            setUploadingEditBackImage(true)
            const backImageUrl = await apiUploadCardImage(accessToken, editCardBackImageFile)
            cardData.backImageUrl = backImageUrl
            setUploadingEditBackImage(false)
          } catch (error) {
            setUploadingEditBackImage(false)
            console.error('Failed to upload answer image:', error)
            toast.error('Failed to upload answer image')
            setUpdating(false)
            return
          }
        } else if (editCardBackImageUrl.trim()) {
          cardData.backImageUrl = editCardBackImageUrl.trim()
        } else {
          cardData.backImageUrl = null
        }
      }

      // Convert to API format with correct field names
      const { correctAnswers, acceptedAnswers, incorrectAnswers, frontImageUrl, backImageUrl, frontAudio, backAudio, ...rest } = cardData
      
      const apiData: ApiCardData = {
        ...rest,
        ...(frontImageUrl !== null && frontImageUrl !== undefined ? { frontImageUrl } : {}),
        ...(backImageUrl !== null && backImageUrl !== undefined ? { backImageUrl } : {}),
        ...(frontAudio !== null && frontAudio !== undefined ? { frontAudio: frontAudio } : {}),
        ...(backAudio !== null && backAudio !== undefined ? { backAudio: backAudio } : {}),
      }
      
      // Add answer arrays with correct field names based on card type
      if (editCardType === 'multiple-choice' && correctAnswers && incorrectAnswers) {
        apiData.correctAnswers = correctAnswers
        apiData.incorrectAnswers = incorrectAnswers
      } else if (editCardType === 'type-answer' && acceptedAnswers) {
        apiData.acceptedAnswers = acceptedAnswers
      }
      
      const updatedCard = await apiUpdateCard(accessToken, selectedDeckId, editingCardId, apiData)

      updateCard(editingCardId, updatedCard)
      setEditCardDialogOpen(false)
      toast.success('Card updated successfully!')
      
      // Reset edit state
      setEditingCardId(null)
      setEditCardFront('')
      setEditCardBack('')
      setEditCardFrontImageUrl('')
      setEditCardImageFile(null)
      setEditCardBackImageUrl('')
      setEditCardBackImageFile(null)
      setEditCardFrontAudio('')
      setEditCardBackAudio('')
      setEditCardAcceptedAnswers([''])
      setEditCardIncorrectAnswers(['', '', ''])
      setEditCardTypeAnswerAcceptedAnswers([''])
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to update card:', error)
      toast.error('Failed to update card')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!accessToken) return

    try {
      await apiDeleteCard(accessToken, deck.id, cardId)
      removeCard(cardId)
      
      // ✅ Get FRESH deck from store
      const freshDeck = decks.find(d => d.id === deck.id)
      if (freshDeck) {
        const newCardCount = Math.max(0, (freshDeck.cardCount || 0) - 1)
        console.log(`🗑️ Delete: ${freshDeck.cardCount} - 1 = ${newCardCount}`)
        updateDeck(deck.id, { cardCount: newCardCount })
      }
      
      toast.success('Card deleted successfully!')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to delete card:', error)
      toast.error('Failed to delete card')
    }
  }

  const handleDeleteSelectedCards = async () => {
    if (!accessToken || selectedCards.size === 0) return

    try {
      const cardIds = Array.from(selectedCards)
      await Promise.all(cardIds.map(id => apiDeleteCard(accessToken, deck.id, id)))
      
      cardIds.forEach(id => removeCard(id))
      
      // ✅ Calculate actual remaining cards after deletion
      const remainingCards = deckCards.filter(c => !cardIds.includes(c.id))
      const newCardCount = remainingCards.length
      
      console.log(`🗑️ Bulk delete: ${deckCards.length} cards -> ${newCardCount} remaining`)
      updateDeck(deck.id, { cardCount: newCardCount })
      
      setSelectedCards(new Set())
      setSelectionMode(false)
      toast.success(`${cardIds.length} cards deleted successfully!`)
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to delete cards:', error)
      toast.error('Failed to delete cards')
    }
  }

const handleToggleFavorite = async (cardId: string) => {
  const card = deckCards.find(c => c.id === cardId)
  if (!card || !accessToken) return

  try {
    // ✅ Update backend first
    await apiUpdateCard(accessToken, deck.id, cardId, { 
      favorite: !card.favorite 
    })
    
    // ✅ Then update local state
    updateCard(cardId, { favorite: !card.favorite })
    
    toast.success(card.favorite ? 'Removed from favorites' : 'Added to favorites')
  } catch (error) {
    handleAuthError(error)
    console.error('Failed to toggle favorite:', error)
    toast.error('Failed to update favorite status')
  }
}

  const handleToggleIgnored = async (cardId: string) => {
    const card = deckCards.find(c => c.id === cardId)
    if (!card || !accessToken) return

    try {
      // ✅ Update backend first
      await apiUpdateCard(accessToken, deck.id, cardId, { 
        isIgnored: !card.isIgnored 
      })
      
      // ✅ Then update local state
      updateCard(cardId, { isIgnored: !card.isIgnored })
      
      toast.success(card.isIgnored ? 'Card unignored' : 'Card ignored')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to toggle ignored:', error)
      toast.error('Failed to update ignored status')
    }
  }

  const handleCardDragStart = (cardId: string) => {
    setDraggedCard(cardId)
  }

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleCardDrop = (cardId: string) => {
    if (!draggedCard || draggedCard === cardId) {
      setDraggedCard(null)
      return
    }

    const draggedIndex = deckCards.findIndex(c => c.id === draggedCard)
    const dropIndex = deckCards.findIndex(c => c.id === cardId)
    
    if (draggedIndex !== -1 && dropIndex !== -1) {
      handleReorderCards(draggedCard, dropIndex)
    }
    
    setDraggedCard(null)
  }

  const handleSelectAll = () => {
    setSelectedCards(new Set(deckCards.map(c => c.id)))
  }

  const handleDeselectAll = () => {
    setSelectedCards(new Set())
  }

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !deck) return

    try {
      const updates = {
        name: editName,
        emoji: editEmoji,
        color: editColor,
        category: editCategory || undefined,
        subtopic: editSubtopic || undefined,
        difficulty: editDifficulty || undefined,
        frontLanguage: editFrontLanguage || undefined,
        backLanguage: editBackLanguage || undefined,
      }

      await apiUpdateDeck(accessToken, deck.id, updates)
      updateDeck(deck.id, updates)
      setEditDialogOpen(false)
      toast.success('Deck updated successfully!')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to update deck:', error)
      toast.error('Failed to update deck')
    }
  }

  const handleDeleteDeck = async () => {
    if (!accessToken || !deck) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${deck.name}"? This will delete all ${deckCards.length} cards in this deck. This action cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)
    try {
      await apiDeleteDeck(accessToken, deck.id)
      removeDeck(deck.id)
      navigateTo('decks')
      toast.success('Deck deleted successfully!')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to delete deck:', error)
      toast.error('Failed to delete deck')
    } finally {
      setDeleting(false)
    }
  }

  const handleStartStudy = () => {
    if (deckCards.length === 0) {
      toast.error('Add some cards to this deck before studying!')
      return
    }
    navigateTo('study-options')
  }

  const handlePublishDeck = async () => {
    if (!accessToken || !deck) return

    if (deckCards.length === 0) {
      toast.error('Cannot publish an empty deck. Add some cards first!')
      return
    }

    if (!deck.category) {
      toast.error('Please set a category for your deck before publishing')
      setPublishDialogOpen(false)
      setEditDialogOpen(true)
      return
    }

    setPublishing(true)
    try {
      await apiPublishDeck(
        accessToken, 
        deck.id,
        {
          category: deck.category,
          subtopic: deck.subtopic,
        }
      )
      updateDeck(deck.id, { isPublished: true })
      setPublishDialogOpen(false)
      toast.success('Deck published to community!')
    } catch (error) {
      console.error('❌ Failed to publish deck:', error)
      if (error.message?.includes('No changes detected')) {
        toast.info('This deck is already published with no changes. Make edits to the deck to publish an update.')
      } else {
        toast.error(error.message || 'Failed to publish deck to community')
      }
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublishDeck = async () => {
    if (!accessToken || !deck) return

    const confirmed = window.confirm(
      'Are you sure you want to unpublish this deck from the community?'
    )

    if (!confirmed) return

    setUnpublishing(true)
    try {
      await apiUnpublishDeck(accessToken, deck.id)
      updateDeck(deck.id, { isPublished: false })
      toast.success('Deck unpublished from community')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to unpublish deck:', error)
      toast.error('Failed to unpublish deck')
    } finally {
      setUnpublishing(false)
    }
  }

  const handleReorderCards = async (cardId: string, newIndex: number) => {
    if (!accessToken || !selectedDeckId) return

    // Store original order for rollback on error
    const originalCards = [...deckCards]
    
    try {
      // Reorder cards locally IMMEDIATELY for instant UI feedback
      const currentCards = [...deckCards]
      const draggedIndex = currentCards.findIndex(c => c.id === cardId)
      
      if (draggedIndex === -1) return
      
      // Remove the dragged card
      const [draggedCard] = currentCards.splice(draggedIndex, 1)
      // Insert at new position
      currentCards.splice(newIndex, 0, draggedCard)
      
      // Update positions for all cards
      const updatedCards = currentCards.map((card, index) => ({
        ...card,
        position: index
      }))
      
      // Update local state IMMEDIATELY (optimistic update)
      updatedCards.forEach(card => {
        updateCard(card.id, { position: card.position })
      })
      
      // Prepare positions array for API
      const positions = updatedCards.map((card, index) => ({
        id: card.id,
        position: index
      }))
      
      // Send to backend in the background (don't await yet)
      await apiReorderCard(accessToken, selectedDeckId, positions)
      
      // Success! No need to reload from server since we already updated locally
    } catch (error) {
      // Rollback on error - restore original positions
      originalCards.forEach(card => {
        updateCard(card.id, { position: card.position })
      })
      
      handleAuthError(error)
      console.error('Failed to reorder cards:', error)
      toast.error('Failed to reorder cards')
    }
  }

  // AI Translation Handlers
  const handleTranslateFront = async () => {
    if (!accessToken) return
    
    // Check if user is premium
    if (user?.subscriptionTier === 'free') {
      toast.error('Translation requires a Premium or Pro subscription')
      setUpgradeModalOpen(true)
      return
    }

    if (!newCardFront.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    if (!deck?.frontLanguage) {
      toast.error('Please set a front language for this deck in deck settings')
      return
    }

    setTranslatingFront(true)
    try {
      const result = await apiTranslateText(accessToken, newCardFront, deck.frontLanguage)
      setNewCardFront(result.translatedText)
      toast.success('Translation complete!')
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Failed to translate text')
    } finally {
      setTranslatingFront(false)
    }
  }

  const handleTranslateBack = async () => {
    if (!accessToken) return
    
    // Check if user is premium
    if (user?.subscriptionTier === 'free') {
      toast.error('Translation requires a Premium or Pro subscription')
      setUpgradeModalOpen(true)
      return
    }

    if (!newCardBack.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    if (!deck?.backLanguage) {
      toast.error('Please set a back language for this deck in deck settings')
      return
    }

    setTranslatingBack(true)
    try {
      const result = await apiTranslateText(accessToken, newCardBack, deck.backLanguage)
      setNewCardBack(result.translatedText)
      toast.success('Translation complete!')
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Failed to translate text')
    } finally {
      setTranslatingBack(false)
    }
  }

  const handleTranslateEditFront = async () => {
    if (!accessToken) return
    
    // Check if user is premium
    if (user?.subscriptionTier === 'free') {
      toast.error('Translation requires a Premium or Pro subscription')
      setUpgradeModalOpen(true)
      return
    }

    if (!editCardFront.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    if (!deck?.frontLanguage) {
      toast.error('Please set a front language for this deck in deck settings')
      return
    }

    setTranslatingEditFront(true)
    try {
      const result = await apiTranslateText(accessToken, editCardFront, deck.frontLanguage)
      setEditCardFront(result.translatedText)
      toast.success('Translation complete!')
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Failed to translate text')
    } finally {
      setTranslatingEditFront(false)
    }
  }

  const handleTranslateEditBack = async () => {
    if (!accessToken) return
    
    // Check if user is premium
    if (user?.subscriptionTier === 'free') {
      toast.error('Translation requires a Premium or Pro subscription')
      setUpgradeModalOpen(true)
      return
    }

    if (!editCardBack.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    if (!deck?.backLanguage) {
      toast.error('Please set a back language for this deck in deck settings')
      return
    }

    setTranslatingEditBack(true)
    try {
      const result = await apiTranslateText(accessToken, editCardBack, deck.backLanguage)
      setEditCardBack(result.translatedText)
      toast.success('Translation complete!')
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Failed to translate text')
    } finally {
      setTranslatingEditBack(false)
    }
  }

  // Bulk add cards handler - updated for new API structure
  const handleBulkAddCards = async (cardsData: any[]) => {
    if (!accessToken || !selectedDeckId) return

    try {
      console.log(`🚀 Starting bulk card creation for ${cardsData.length} cards`)
      
      const cardsToCreate: ApiCardData[] = []
      const failedCards: any[] = []

      // Process each card
      for (const cardInput of cardsData) {
        try {
          const cardData: CardData = {
            front: cardInput.front || '',
            cardType: cardInput.cardType || 'classic-flip',
          }

          // Handle front image upload
          if (cardInput.frontImageFile) {
            try {
              const imageUrl = await apiUploadCardImage(accessToken, cardInput.frontImageFile)
              cardData.frontImageUrl = imageUrl
            } catch (error) {
              console.error('Failed to upload front image:', error)
              failedCards.push(cardInput)
              continue
            }
          }

          // Handle card type specific fields
          if (cardInput.cardType === 'classic-flip') {
            cardData.back = cardInput.back || ''
            
            // Handle back image
            if (cardInput.backImageFile) {
              try {
                const backImageUrl = await apiUploadCardImage(accessToken, cardInput.backImageFile)
                cardData.backImageUrl = backImageUrl
              } catch (error) {
                console.error('Failed to upload back image:', error)
                failedCards.push(cardInput)
                continue
              }
            }

            // Handle audio files
            if (cardInput.frontAudio) {
              cardData.frontAudio = cardInput.frontAudio
            }

            if (cardInput.backAudio) {
              cardData.backAudio = cardInput.backAudio
            }
          } else if (cardInput.cardType === 'multiple-choice') {
            // Multiple-choice: use correctAnswers and incorrectAnswers arrays
            cardData.correctAnswers = cardInput.correctAnswers?.filter((a: string) => a.trim()) || []
            cardData.incorrectAnswers = cardInput.incorrectAnswers?.filter((a: string) => a.trim()) || []
          } else if (cardInput.cardType === 'type-answer') {
            // Type-answer: requires back + optional acceptedAnswers
            cardData.back = cardInput.back || ''
            cardData.acceptedAnswers = cardInput.acceptedAnswers?.filter((a: string) => a.trim()) || []
          }

          // Convert to API format with correct field names
          const { correctAnswers, acceptedAnswers, incorrectAnswers, frontImageUrl, backImageUrl, frontAudio, backAudio, ...rest } = cardData
          
          const apiData: ApiCardData = {
            ...rest,
            ...(frontImageUrl !== null && frontImageUrl !== undefined ? { frontImageUrl } : {}),
            ...(backImageUrl !== null && backImageUrl !== undefined ? { backImageUrl } : {}),
            ...(frontAudio !== null && frontAudio !== undefined ? { frontAudio: frontAudio } : {}),
            ...(backAudio !== null && backAudio !== undefined ? { backAudio: backAudio } : {}),
          }

          // Add answer arrays based on card type
          if (cardInput.cardType === 'multiple-choice' && correctAnswers && incorrectAnswers) {
            apiData.correctAnswers = correctAnswers
            apiData.incorrectAnswers = incorrectAnswers
          } else if (cardInput.cardType === 'type-answer' && acceptedAnswers) {
            apiData.acceptedAnswers = acceptedAnswers
          }

          cardsToCreate.push(apiData)
        } catch (error) {
          console.error('Error processing card:', error)
          failedCards.push(cardInput)
        }
      }

      // Batch create all cards
      if (cardsToCreate.length > 0) {
        console.log(`⚡ Batch creating ${cardsToCreate.length} cards...`)
        const createdCards = await apiCreateCardsBatch(accessToken, selectedDeckId, cardsToCreate)
        
        if (createdCards && Array.isArray(createdCards)) {
          createdCards.forEach((card: any) => {
            addCard(card)
          })
          console.log(`✅ Successfully batch created ${createdCards.length} cards`)
        }
      }

      // Update deck card count
      if (deck) {
        updateDeck(deck.id, { cardCount: (deck.cardCount || 0) + cardsToCreate.length })
      }

      // Show results
      const successCount = cardsToCreate.length
      const failCount = failedCards.length

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} ${successCount === 1 ? 'card' : 'cards'}!`)
      }
      if (failCount > 0) {
        toast.error(`Failed to add ${failCount} ${failCount === 1 ? 'card' : 'cards'} due to errors`)
      }
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to bulk add cards:', error)
      toast.error('Failed to add cards. Please try again.')
    }
  }

  // Translation wrapper for bulk add
  const handleBulkTranslate = async (text: string, language: string): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated')
    
    const result = await apiTranslateText(accessToken, text, language)
    return result.translatedText
  }

  // Image upload wrapper for bulk add
  const handleBulkImageUpload = async (file: File): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated')
    
    const imageUrl = await apiUploadCardImage(accessToken, file)
    return imageUrl
  }

  // Audio upload wrapper for bulk add
  const handleBulkAudioUpload = async (file: File): Promise<string> => {
    const audioUrl = await apiUploadCardAudio(file)
    return audioUrl
  }

  if (!deck) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-900 dark:text-gray-100">Deck not found</div>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">Loading cards...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <DeckHeader
            deck={deck}
            cardCount={deckCards.length}
            onBack={() => navigateTo('decks')}
            onOpenSettings={() => setEditDialogOpen(true)}
            onOpenPublish={() => {
              if (!canPublishToCommunity(user?.subscriptionTier, user?.isSuperuser, user?.isModerator)) {
                setUpgradeModalOpen(true)
              } else {
                setPublishDialogOpen(true)
              }
            }}
            onUnpublish={handleUnpublishDeck}
            onDelete={handleDeleteDeck}
            onStartStudy={handleStartStudy}
            onAddCard={() => setCreateDialogOpen(true)}
            onBulkAddCards={() => setBulkAddDialogOpen(true)}
            onAIGenerate={() => navigateTo('ai-generate')}
            deleting={deleting}
            unpublishing={unpublishing}
            canPublish={canPublishToCommunity(user?.subscriptionTier, user?.isSuperuser, user?.isModerator)}
            communityDeckAuthor={communityDeckAuthor}
            studyCount={studyCount}
            averageScore={averageScore}
          />

          <DeckSettingsDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            name={editName}
            emoji={editEmoji}
            color={editColor}
            category={editCategory}
            subtopic={editSubtopic}
            difficulty={editDifficulty}
            frontLanguage={editFrontLanguage}
            backLanguage={editBackLanguage}
            onNameChange={setEditName}
            onEmojiChange={setEditEmoji}
            onColorChange={setEditColor}
            onCategoryChange={setEditCategory}
            onSubtopicChange={setEditSubtopic}
            onDifficultyChange={setEditDifficulty}
            onFrontLanguageChange={setEditFrontLanguage}
            onBackLanguageChange={setEditBackLanguage}
            onSubmit={handleUpdateDeck}
          />

          <PublishDeckDialog
            open={publishDialogOpen}
            onOpenChange={setPublishDialogOpen}
            deck={deck}
            cardCount={deckCards.length}
            publishing={publishing}
            onPublish={handlePublishDeck}
            onOpenSettings={() => {
              setPublishDialogOpen(false)
              setEditDialogOpen(true)
            }}
          />

          <AddCardModal
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            cardType={newCardType}
            front={newCardFront}
            back={newCardBack}
            frontImageUrl={newCardFrontImageUrl}
            frontImageFile={newCardImageFile}
            backImageUrl={newCardBackImageUrl}
            backImageFile={newCardBackImageFile}
            frontAudio={newCardFrontAudio}
            backAudio={newCardBackAudio}
            correctAnswers={newCardCorrectAnswers}
            incorrectAnswers={newCardIncorrectAnswers}
            acceptedAnswers={newCardAcceptedAnswers}
            creating={creating}
            uploadingImage={uploadingImage}
            uploadingBackImage={uploadingBackImage}
            userTier={user?.subscriptionTier}
            deckFrontLanguage={deck?.frontLanguage}
            deckBackLanguage={deck?.backLanguage}
            onCardTypeChange={setNewCardType}
            onFrontChange={setNewCardFront}
            onBackChange={setNewCardBack}
            onFrontImageChange={(file, url) => {
              setNewCardImageFile(file)
              setNewCardFrontImageUrl(url)
            }}
            onBackImageChange={(file, url) => {
              setNewCardBackImageFile(file)
              setNewCardBackImageUrl(url)
            }}
            onFrontAudioChange={setNewCardFrontAudio}
            onBackAudioChange={setNewCardBackAudio}
            onCorrectAnswersChange={setNewCardCorrectAnswers}
            onIncorrectAnswersChange={setNewCardIncorrectAnswers}
            onAcceptedAnswersChange={setNewCardAcceptedAnswers}
            onSubmit={handleCreateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            onTranslateFront={handleTranslateFront}
            onTranslateBack={handleTranslateBack}
            isSuperuser={user?.isSuperuser}
            translatingFront={translatingFront}
            translatingBack={translatingBack}
          />

          <EditCardModal
            open={editCardDialogOpen}
            onOpenChange={setEditCardDialogOpen}
            cardType={editCardType}
            front={editCardFront}
            back={editCardBack}
            frontImageUrl={editCardFrontImageUrl}
            frontImageFile={editCardImageFile}
            backImageUrl={editCardBackImageUrl}
            backImageFile={editCardBackImageFile}
            frontAudio={editCardFrontAudio}
            backAudio={editCardBackAudio}
            correctAnswers={editCardCorrectAnswers}
            incorrectAnswers={editCardIncorrectAnswers}
            acceptedAnswers={editCardTypeAnswerAcceptedAnswers}
            updating={updating}
            uploadingImage={uploadingEditImage}
            uploadingBackImage={uploadingEditBackImage}
            userTier={user?.subscriptionTier}
            deckFrontLanguage={deck?.frontLanguage}
            deckBackLanguage={deck?.backLanguage}
            onCardTypeChange={setEditCardType}
            onFrontChange={setEditCardFront}
            onBackChange={setEditCardBack}
            onFrontImageChange={(file, url) => {
              setEditCardImageFile(file)
              setEditCardFrontImageUrl(url)
            }}
            onBackImageChange={(file, url) => {
              setEditCardBackImageFile(file)
              setEditCardBackImageUrl(url)
            }}
            onFrontAudioChange={setEditCardFrontAudio}
            onBackAudioChange={setEditCardBackAudio}
            onCorrectAnswersChange={setEditCardCorrectAnswers}
            onIncorrectAnswersChange={setEditCardIncorrectAnswers}
            onAcceptedAnswersChange={setEditCardTypeAnswerAcceptedAnswers}
            onSubmit={handleUpdateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            onTranslateFront={handleTranslateEditFront}
            onTranslateBack={handleTranslateEditBack}
            translatingFront={translatingEditFront}
            translatingBack={translatingEditBack}
          />

          <BulkAddCardsDialog
            open={bulkAddDialogOpen}
            onOpenChange={setBulkAddDialogOpen}
            onSubmit={handleBulkAddCards}
            deckFrontLanguage={deck?.frontLanguage}
            deckBackLanguage={deck?.backLanguage}
            userTier={user?.subscriptionTier}
            onTranslate={handleBulkTranslate}
            onUploadImage={handleBulkImageUpload}
            onUploadAudio={handleBulkAudioUpload}
          />

          <CardList
            cards={deckCards}
            onEditCard={handleOpenEditCard}
            onDeleteCard={handleDeleteCard}
            onToggleFavorite={handleToggleFavorite}
            onToggleIgnored={handleToggleIgnored}
            onCardDragStart={handleCardDragStart}
            onCardDragOver={handleCardDragOver}
            onCardDrop={handleCardDrop}
            selectionMode={selectionMode}
            onToggleSelectionMode={() => {
              setSelectionMode(!selectionMode)
              if (selectionMode) {
                setSelectedCards(new Set())
              }
            }}
            onToggleCardSelection={(cardId) => {
              const newSelection = new Set(selectedCards)
              if (newSelection.has(cardId)) {
                newSelection.delete(cardId)
              } else {
                newSelection.add(cardId)
              }
              setSelectedCards(newSelection)
            }}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkDelete={handleDeleteSelectedCards}
            selectedCards={selectedCards}
          />

          <UpgradeModal
            open={upgradeModalOpen}
            onOpenChange={setUpgradeModalOpen}
          />
        </div>
      </div>
    </AppLayout>
  )
}