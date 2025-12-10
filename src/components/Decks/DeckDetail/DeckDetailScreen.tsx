import { useEffect, useState } from 'react'
import { useStore, CardType, CommunityDeck, Card } from '../../../../store/useStore'
import { useNavigation } from '../../../../hooks/useNavigation'
import * as api from '../../../../utils/api'
import { AppLayout } from '../../Layout/AppLayout'
import { DeckHeader } from './DeckHeader'
import { AddCardModal } from './AddCardModal'
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
  front: string
  back: string
  cardType: string
  frontImageUrl?: string | null
  backImageUrl?: string | null
  frontAudioUrl?: string | null
  backAudioUrl?: string | null
  options?: string[]
  correctAnswers?: string[]
  acceptedAnswers?: string[]
}

interface ApiCardData {
  front: string
  back: string
  cardType: string
  frontImageUrl?: string
  backImageUrl?: string
  frontAudioUrl?: string
  backAudioUrl?: string
  options?: string[]
  acceptedAnswers?: string[]
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
  
  const [newCardType, setNewCardType] = useState<CardType>('classic-flip')
  const [newCardFront, setNewCardFront] = useState('')
  const [newCardBack, setNewCardBack] = useState('')
  const [newCardFrontImageUrl, setNewCardFrontImageUrl] = useState('')
  const [newCardImageFile, setNewCardImageFile] = useState<File | null>(null)
  const [newCardBackImageUrl, setNewCardBackImageUrl] = useState('')
  const [newCardBackImageFile, setNewCardBackImageFile] = useState<File | null>(null)
  const [newCardFrontAudioUrl, setNewCardFrontAudioUrl] = useState('')
  const [newCardBackAudioUrl, setNewCardBackAudioUrl] = useState('')
  const [newCardOptions, setNewCardOptions] = useState<string[]>(['', ''])
  const [newCardCorrectIndices, setNewCardCorrectIndices] = useState<number[]>([0])
  const [newCardAcceptedAnswers, setNewCardAcceptedAnswers] = useState('')
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

  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editCardType, setEditCardType] = useState<CardType>('classic-flip')
  const [editCardFront, setEditCardFront] = useState('')
  const [editCardBack, setEditCardBack] = useState('')
  const [editCardFrontImageUrl, setEditCardFrontImageUrl] = useState('')
  const [editCardImageFile, setEditCardImageFile] = useState<File | null>(null)
  const [editCardBackImageUrl, setEditCardBackImageUrl] = useState('')
  const [editCardBackImageFile, setEditCardBackImageFile] = useState<File | null>(null)
  const [editCardFrontAudioUrl, setEditCardFrontAudioUrl] = useState('')
  const [editCardBackAudioUrl, setEditCardBackAudioUrl] = useState('')
  const [editCardOptions, setEditCardOptions] = useState<string[]>(['', ''])
  const [editCardCorrectIndices, setEditCardCorrectIndices] = useState<number[]>([0])
  const [editCardAcceptedAnswers, setEditCardAcceptedAnswers] = useState('')
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
      const publishedDecks = await api.fetchCommunityDecks()
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
      const fetchedCards = await api.fetchCards(accessToken, selectedDeckId)
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
    
    if (!newCardFront.trim() && !newCardImageFile) {
      toast.error('Please provide question text or image')
      return
    }

    if (newCardType === 'multiple-choice') {
      const filledOptions = newCardOptions.filter(opt => opt.trim())
      if (filledOptions.length < 2) {
        toast.error('Please provide at least 2 options')
        return
      }
      if (newCardCorrectIndices.length === 0) {
        toast.error('Please select at least one correct answer')
        return
      }
      const invalidIndices = newCardCorrectIndices.filter(idx => idx >= filledOptions.length)
      if (invalidIndices.length > 0) {
        toast.error('Invalid correct answer selection')
        return
      }
    } else if (newCardType === 'classic-flip') {
      if (!newCardBack.trim() && !newCardBackImageFile) {
        toast.error('Please provide answer text or image')
        return
      }
    } else {
      if (!newCardBack.trim()) {
        toast.error('Please provide an answer')
        return
      }
    }

    setCreating(true)
    try {
      const cardData: CardData = {
        front: newCardFront,
        back: newCardBack, // Initialize with default value
        cardType: newCardType,
      }

      if (newCardImageFile && accessToken) {
        try {
          setUploadingImage(true)
          const imageUrl = await api.uploadCardImage(accessToken, newCardImageFile)
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

      if (newCardType === 'multiple-choice') {
        const filledOptions = newCardOptions.filter(opt => opt.trim())
        const correctAnswers = newCardCorrectIndices.map(idx => filledOptions[idx])
        const incorrectOptions = filledOptions.filter((_, idx) => !newCardCorrectIndices.includes(idx))
        
        cardData.back = correctAnswers[0] // Override for multiple-choice
        cardData.correctAnswers = correctAnswers
        cardData.options = incorrectOptions
      } else {
        cardData.back = newCardBack
      }

      if (newCardType === 'classic-flip' && newCardBackImageFile && accessToken) {
        try {
          setUploadingBackImage(true)
          const backImageUrl = await api.uploadCardImage(accessToken, newCardBackImageFile)
          cardData.backImageUrl = backImageUrl
          setUploadingBackImage(false)
        } catch (error) {
          setUploadingBackImage(false)
          console.error('Failed to upload answer image:', error)
          toast.error('Failed to upload answer image')
          setCreating(false)
          return
        }
      } else if (newCardType === 'classic-flip' && newCardBackImageUrl.trim()) {
        cardData.backImageUrl = newCardBackImageUrl.trim()
      }

      // Handle audio URLs
      if (newCardFrontAudioUrl.trim()) {
        cardData.frontAudioUrl = newCardFrontAudioUrl.trim()
      }

      if (newCardBackAudioUrl.trim()) {
        cardData.backAudioUrl = newCardBackAudioUrl.trim()
      }

      if (newCardType === 'type-answer' && newCardAcceptedAnswers.trim()) {
        cardData.acceptedAnswers = newCardAcceptedAnswers
          .split(',')
          .map(ans => ans.trim())
          .filter(ans => ans.length > 0)
      }

      // Remove correctAnswers and convert null to undefined for API compatibility
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { correctAnswers: _correctAnswers, frontImageUrl, backImageUrl, frontAudioUrl, backAudioUrl, ...rest } = cardData
      
      const apiData: ApiCardData = {
        ...rest,
        ...(frontImageUrl !== null && frontImageUrl !== undefined ? { frontImageUrl } : {}),
        ...(backImageUrl !== null && backImageUrl !== undefined ? { backImageUrl } : {}),
        ...(frontAudioUrl !== null && frontAudioUrl !== undefined ? { frontAudioUrl } : {}),
        ...(backAudioUrl !== null && backAudioUrl !== undefined ? { backAudioUrl } : {}),
      }
      
      const card = await api.createCard(accessToken, selectedDeckId, apiData)

      addCard(card)
      
      if (deck) {
        updateDeck(deck.id, { cardCount: (deck.cardCount || 0) + 1 })
      }

      if (closeDialog) {
        setCreateDialogOpen(false)
      }
      setNewCardType('classic-flip')
      setNewCardFront('')
      setNewCardBack('')
      setNewCardFrontImageUrl('')
      setNewCardImageFile(null)
      setNewCardBackImageUrl('')
      setNewCardBackImageFile(null)
      setNewCardFrontAudioUrl('')
      setNewCardBackAudioUrl('')
      setNewCardOptions(['', ''])
      setNewCardCorrectIndices([0])
      setNewCardAcceptedAnswers('')
      
      if (!closeDialog) {
        toast.success('Card added! Add another card below.')
      }
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to create card:', error)
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
    setEditCardBack(card.back)
    setEditCardFrontImageUrl(card.frontImageUrl || '')
    setEditCardImageFile(null)
    setEditCardBackImageUrl(card.backImageUrl || '')
    setEditCardBackImageFile(null)
    setEditCardFrontAudioUrl(card.frontAudioUrl || '')
    setEditCardBackAudioUrl(card.backAudioUrl || '')
    
    if (card.cardType === 'multiple-choice') {
      const correctAnswers = card.correctAnswers || [card.back]
      const incorrectOptions = card.options || []
      const allOptions = [...correctAnswers, ...incorrectOptions]
      setEditCardOptions(allOptions)
      const correctIndices = correctAnswers.map((_, idx) => idx)
      setEditCardCorrectIndices(correctIndices)
    } else {
      setEditCardOptions(['', ''])
      setEditCardCorrectIndices([0])
    }
    
    setEditCardAcceptedAnswers(card.acceptedAnswers?.join(', ') || '')
    setEditCardDialogOpen(true)
  }

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !selectedDeckId || !editingCardId) return
    
    if (!editCardFront.trim() && !editCardImageFile && !editCardFrontImageUrl) {
      toast.error('Please provide question text or image')
      return
    }

    if (editCardType === 'multiple-choice') {
      const filledOptions = editCardOptions.filter(opt => opt.trim())
      if (filledOptions.length < 2) {
        toast.error('Please provide at least 2 options')
        return
      }
      if (editCardCorrectIndices.length === 0) {
        toast.error('Please select at least one correct answer')
        return
      }
      const invalidIndices = editCardCorrectIndices.filter(idx => idx >= filledOptions.length)
      if (invalidIndices.length > 0) {
        toast.error('Invalid correct answer selection')
        return
      }
    } else if (editCardType === 'classic-flip') {
      if (!editCardBack.trim() && !editCardBackImageFile && !editCardBackImageUrl) {
        toast.error('Please provide answer text or image')
        return
      }
    } else {
      if (!editCardBack.trim()) {
        toast.error('Please provide an answer')
        return
      }
    }

    setUpdating(true)
    try {
      const cardData: CardData = {
        front: editCardFront,
        back: editCardBack, // Initialize with default value
        cardType: editCardType,
      }

      if (editCardImageFile && accessToken) {
        try {
          setUploadingEditImage(true)
          const imageUrl = await api.uploadCardImage(accessToken, editCardImageFile)
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

      if (editCardType === 'multiple-choice') {
        const filledOptions = editCardOptions.filter(opt => opt.trim())
        const correctAnswers = editCardCorrectIndices.map(idx => filledOptions[idx])
        const incorrectOptions = filledOptions.filter((_, idx) => !editCardCorrectIndices.includes(idx))
        
        cardData.back = correctAnswers[0] // Override for multiple-choice
        cardData.correctAnswers = correctAnswers
        cardData.options = incorrectOptions
      } else {
        cardData.back = editCardBack
      }

      if (editCardType === 'classic-flip' && editCardBackImageFile && accessToken) {
        try {
          setUploadingEditBackImage(true)
          const backImageUrl = await api.uploadCardImage(accessToken, editCardBackImageFile)
          cardData.backImageUrl = backImageUrl
          setUploadingEditBackImage(false)
        } catch (error) {
          setUploadingEditBackImage(false)
          console.error('Failed to upload answer image:', error)
          toast.error('Failed to upload answer image')
          setUpdating(false)
          return
        }
      } else if (editCardType === 'classic-flip' && editCardBackImageUrl.trim()) {
        cardData.backImageUrl = editCardBackImageUrl.trim()
      } else if (editCardType === 'classic-flip') {
        cardData.backImageUrl = null
      }

      // Handle audio URLs
      if (editCardFrontAudioUrl.trim()) {
        cardData.frontAudioUrl = editCardFrontAudioUrl.trim()
      } else {
        cardData.frontAudioUrl = null
      }

      if (editCardBackAudioUrl.trim()) {
        cardData.backAudioUrl = editCardBackAudioUrl.trim()
      } else {
        cardData.backAudioUrl = null
      }

      if (editCardType === 'type-answer' && editCardAcceptedAnswers.trim()) {
        cardData.acceptedAnswers = editCardAcceptedAnswers
          .split(',')
          .map(ans => ans.trim())
          .filter(ans => ans.length > 0)
      } else if (editCardType !== 'type-answer') {
        cardData.acceptedAnswers = []
      }

      if (editCardType !== 'multiple-choice') {
        cardData.options = []
      }

      // Remove correctAnswers and convert null to undefined for API compatibility
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { correctAnswers: _correctAnswers, frontImageUrl, backImageUrl, frontAudioUrl, backAudioUrl, ...rest } = cardData
      
      const apiData: ApiCardData = {
        ...rest,
        ...(frontImageUrl !== null && frontImageUrl !== undefined ? { frontImageUrl } : {}),
        ...(backImageUrl !== null && backImageUrl !== undefined ? { backImageUrl } : {}),
        ...(frontAudioUrl !== null && frontAudioUrl !== undefined ? { frontAudioUrl } : {}),
        ...(backAudioUrl !== null && backAudioUrl !== undefined ? { backAudioUrl } : {}),
      }
      
      const updatedCard = await api.updateCard(accessToken, selectedDeckId, editingCardId, apiData)

      updateCard(editingCardId, updatedCard)

      setEditCardDialogOpen(false)
      setEditingCardId(null)
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to update card:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!accessToken || !selectedDeckId) return

    try {
      await api.deleteCard(accessToken, selectedDeckId, cardId)
      removeCard(cardId)
      
      if (deck) {
        updateDeck(deck.id, { cardCount: Math.max(0, (deck.cardCount || 0) - 1) })
      }
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to delete card:', error)
    }
  }

  const handleDeleteDeck = async () => {
    if (!accessToken || !selectedDeckId) return

    setDeleting(true)
    try {
      const result = await api.deleteDeck(accessToken, selectedDeckId)
      removeDeck(selectedDeckId)
      navigateTo('decks')
      
      if (result.deletedFromCommunity) {
        toast.success('Deck deleted from your collection and unpublished from community')
      } else {
        toast.success('Deck deleted successfully')
      }
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to delete deck:', error)
      toast.error('Failed to delete deck')
    } finally {
      setDeleting(false)
    }
  }

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !selectedDeckId) return

    try {
      const updated = await api.updateDeck(accessToken, selectedDeckId, {
        name: editName,
        emoji: editEmoji,
        color: editColor,
        category: editCategory,
        subtopic: editSubtopic,
        difficulty: editDifficulty,
        frontLanguage: editFrontLanguage,
        backLanguage: editBackLanguage,
      })

      updateDeck(selectedDeckId, updated)
      setEditDialogOpen(false)
      toast.success('Deck updated successfully')
      
      if (deck?.communityPublishedId) {
        toast.info('Your published deck can be updated by republishing it', {
          duration: 5000,
        })
      }
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to update deck:', error)
      toast.error('Failed to update deck')
    }
  }

  const handleStartStudy = () => {
    if (deckCards.length === 0) return
    navigateTo('study-options')
  }

  const handlePublishDeck = async () => {
    if (!accessToken || !selectedDeckId) {
      toast.error('Something went wrong')
      return
    }

    const deckToPublish = decks.find(d => d.id === selectedDeckId)
    
    if (!deckToPublish) {
      toast.error('Deck not found')
      return
    }

    if (deckToPublish.sourceCommunityDeckId) {
      toast.error('Cannot publish decks imported from the community. Only decks you created can be published.')
      return
    }

    if (!deckToPublish.category || !deckToPublish.subtopic) {
      toast.error('Please set a category and subtopic in deck settings first')
      return
    }

    const deckCardCount = cards.filter(c => c.deckId === selectedDeckId).length

    if (deckCardCount === 0) {
      toast.error('Cannot publish an empty deck')
      return
    }

    if (deckCardCount < 10) {
      toast.error('Deck must have at least 10 cards to be published')
      return
    }

    setPublishing(true)
    try {
      const result = await api.publishDeckToCommunity(accessToken, {
        deckId: selectedDeckId,
        category: deckToPublish.category,
        subtopic: deckToPublish.subtopic,
      })
      
      updateDeck(selectedDeckId, {
        communityPublishedId: result.publishedDeck?.id,
      })
      
      if (result.updated) {
        toast.success('Published deck updated successfully!')
      } else {
        toast.success('Deck published to community!')
      }
      setPublishDialogOpen(false)
    } catch (error: unknown) {
      handleAuthError(error)
      console.error('Failed to publish deck:', error)

      if (error instanceof Error) {
        if (error.message.includes('already been published')) {
          // Just show the info message, don't show error
          toast.info('This deck is already published with no changes. Make edits to the deck to publish an update.')
        } else if (error.message.includes('10 cards')) {
          toast.error(error.message)
        } else {
          toast.error(error.message || 'Failed to publish deck')
        }
      } else {
        toast.error('Failed to publish deck')
      }
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublishDeck = async () => {
    if (!accessToken || !selectedDeckId || !deck?.communityPublishedId) {
      toast.error('Something went wrong')
      return
    }

    setUnpublishing(true)
    try {
      await api.unpublishDeck(accessToken, deck.communityPublishedId)
      
      // Remove the communityPublishedId from the deck
      updateDeck(selectedDeckId, {
        communityPublishedId: undefined,
      })
      
      toast.success('Deck unpublished from community')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to unpublish deck:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to unpublish deck')
      } else {
        toast.error('Failed to unpublish deck')
      }
    } finally {
      setUnpublishing(false)
    }
  }

  const handleCardDragStart = (cardId: string) => {
    setDraggedCard(cardId)
  }

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleCardDrop = async (targetCardId: string) => {
    if (!draggedCard || draggedCard === targetCardId || !accessToken || !selectedDeckId) return

    const draggedIndex = deckCards.findIndex(c => c.id === draggedCard)
    const targetIndex = deckCards.findIndex(c => c.id === targetCardId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const allCards = [...cards]
    const deckCardsOnly = [...deckCards]
    const [removed] = deckCardsOnly.splice(draggedIndex, 1)
    deckCardsOnly.splice(targetIndex, 0, removed)

    const updatedDeckCards = deckCardsOnly.map((card, index) => ({
      ...card,
      position: index,
    }))

    const otherCards = allCards.filter(c => c.deckId !== selectedDeckId)
    setCards([...otherCards, ...updatedDeckCards])
    setDraggedCard(null)

    try {
      await api.updateCardPositions(accessToken, selectedDeckId, updatedDeckCards.map(c => ({ id: c.id, position: c.position })))
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to update card positions:', error)
    }
  }

  const handleToggleFavorite = async (cardId: string) => {
    if (!accessToken || !selectedDeckId) return

    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const newFavoriteValue = !card.favorite

    try {
      await api.updateCard(accessToken, selectedDeckId, cardId, { favorite: newFavoriteValue })
      updateCard(cardId, { favorite: newFavoriteValue })
      toast.success(newFavoriteValue ? 'Added to favorites' : 'Removed from favorites')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to toggle favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }

  const handleToggleIgnored = async (cardId: string) => {
    if (!accessToken || !selectedDeckId) return

    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const newIgnoredValue = !card.ignored

    try {
      await api.updateCard(accessToken, selectedDeckId, cardId, { ignored: newIgnoredValue })
      updateCard(cardId, { ignored: newIgnoredValue })
      toast.success(newIgnoredValue ? 'Card ignored' : 'Card unignored')
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to toggle ignored:', error)
      toast.error('Failed to update ignored status')
    }
  }

  // Multi-select handlers
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedCards(new Set())
    }
  }

  const handleToggleCardSelection = (cardId: string) => {
    const newSelected = new Set(selectedCards)
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId)
    } else {
      newSelected.add(cardId)
    }
    setSelectedCards(newSelected)
  }

  const handleSelectAll = (cardIds: string[]) => {
    setSelectedCards(new Set(cardIds))
  }

  const handleDeselectAll = () => {
    setSelectedCards(new Set())
  }

  const handleBulkDelete = async () => {
    if (!accessToken || !selectedDeckId || selectedCards.size === 0) return

    try {
      const cardIds = Array.from(selectedCards)
      
      // Delete all cards in parallel
      await Promise.all(
        cardIds.map(cardId => api.deleteCard(accessToken, selectedDeckId, cardId))
      )

      // Remove from state
      cardIds.forEach(cardId => removeCard(cardId))
      
      // Update deck card count
      if (deck) {
        updateDeck(deck.id, { cardCount: Math.max(0, (deck.cardCount || 0) - cardIds.length) })
      }

      toast.success(`Deleted ${cardIds.length} card${cardIds.length === 1 ? '' : 's'}`)
      setSelectedCards(new Set())
      setSelectionMode(false)
    } catch (error) {
      handleAuthError(error)
      console.error('Failed to bulk delete cards:', error)
      toast.error('Failed to delete cards')
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

    // Check if deck has frontLanguage set
    if (!deck?.frontLanguage) {
      toast.error('Please set a Front Language for this deck in settings first')
      setEditDialogOpen(true)
      return
    }

    if (!newCardFront.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    setTranslatingFront(true)
    try {
      const result = await api.translateText(accessToken, newCardFront, deck.frontLanguage)
      setNewCardFront(result.translatedText)
      toast.success(`Translated to ${deck.frontLanguage}`)
    } catch (error) {
      console.error('Translation error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to translate text')
      }
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

    // Check if deck has backLanguage set
    if (!deck?.backLanguage) {
      toast.error('Please set a Back Language for this deck in settings first')
      setEditDialogOpen(true)
      return
    }

    if (!newCardBack.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    setTranslatingBack(true)
    try {
      const result = await api.translateText(accessToken, newCardBack, deck.backLanguage)
      setNewCardBack(result.translatedText)
      toast.success(`Translated to ${deck.backLanguage}`)
    } catch (error) {
      console.error('Translation error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to translate text')
      }
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

    // Check if deck has frontLanguage set
    if (!deck?.frontLanguage) {
      toast.error('Please set a Front Language for this deck in settings first')
      setEditDialogOpen(true)
      return
    }

    if (!editCardFront.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    setTranslatingEditFront(true)
    try {
      const result = await api.translateText(accessToken, editCardFront, deck.frontLanguage)
      setEditCardFront(result.translatedText)
      toast.success(`Translated to ${deck.frontLanguage}`)
    } catch (error) {
      console.error('Translation error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to translate text')
      }
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

    // Check if deck has backLanguage set
    if (!deck?.backLanguage) {
      toast.error('Please set a Back Language for this deck in settings first')
      setEditDialogOpen(true)
      return
    }

    if (!editCardBack.trim()) {
      toast.error('Please enter some text to translate')
      return
    }

    setTranslatingEditBack(true)
    try {
      const result = await api.translateText(accessToken, editCardBack, deck.backLanguage)
      setEditCardBack(result.translatedText)
      toast.success(`Translated to ${deck.backLanguage}`)
    } catch (error) {
      console.error('Translation error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to translate text')
      }
    } finally {
      setTranslatingEditBack(false)
    }
  }

  // Bulk Add Cards Handler
  const handleBulkAddCards = async (cards: { 
    id: string
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
  }[]) => {
    if (!accessToken || !selectedDeckId) return

    // Validate that each card has both front and back content
    const validCards = cards.filter(card => {
      const hasFront = card.front.trim() || card.frontImageFile
      const hasBack = card.back.trim() || card.backImageFile || card.cardType === 'multiple-choice'
      return hasFront && hasBack
    })
    
    if (validCards.length === 0) {
      toast.error('Each card must have both front and back content')
      return
    }

    try {
      // Step 1: Upload all images in parallel (much faster!)
      console.log(`⚡ Starting parallel image uploads for ${validCards.length} cards...`)
      const imageUploadPromises = validCards.map(async (card, index) => {
        const result: {
          frontImageUrl?: string
          backImageUrl?: string
          error?: string
          cardIndex: number
        } = { cardIndex: index }

        try {
          // Upload front image if exists
          if (card.frontImageFile) {
            result.frontImageUrl = await api.uploadCardImage(accessToken, card.frontImageFile)
          } else if (card.frontImageUrl.trim()) {
            result.frontImageUrl = card.frontImageUrl.trim()
          }

          // Upload back image if exists (classic flip only)
          if (card.cardType === 'classic-flip' && card.backImageFile) {
            result.backImageUrl = await api.uploadCardImage(accessToken, card.backImageFile)
          } else if (card.cardType === 'classic-flip' && card.backImageUrl.trim()) {
            result.backImageUrl = card.backImageUrl.trim()
          }
        } catch (error) {
          console.error(`Failed to upload images for card ${index + 1}:`, error)
          result.error = `Image upload failed`
        }

        return result
      })

      const imageResults = await Promise.all(imageUploadPromises)
      console.log(`✅ Completed parallel image uploads`)

      // Step 2: Prepare cards for batch creation
      const cardsToCreate: ApiCardData[] = []
      const failedCards: number[] = []

      for (let i = 0; i < validCards.length; i++) {
        const card = validCards[i]
        const imageResult = imageResults[i]

        // Skip cards that had image upload errors
        if (imageResult.error) {
          failedCards.push(i)
          continue
        }

        const cardData: CardData = {
          front: card.front,
          back: card.back,
          cardType: card.cardType,
        }

        // Add uploaded image URLs
        if (imageResult.frontImageUrl) {
          cardData.frontImageUrl = imageResult.frontImageUrl
        }
        if (imageResult.backImageUrl) {
          cardData.backImageUrl = imageResult.backImageUrl
        }

        // Handle card type specific logic
        if (card.cardType === 'multiple-choice') {
          const filledOptions = card.options.filter(opt => opt.trim())
          const correctAnswers = card.correctIndices.map(idx => filledOptions[idx])
          const incorrectOptions = filledOptions.filter((_, idx) => !card.correctIndices.includes(idx))
          
          cardData.back = correctAnswers[0]
          cardData.correctAnswers = correctAnswers
          cardData.options = incorrectOptions
        }

        // Handle accepted answers (type answer only)
        if (card.cardType === 'type-answer' && card.acceptedAnswers.trim()) {
          cardData.acceptedAnswers = card.acceptedAnswers
            .split(',')
            .map(ans => ans.trim())
            .filter(ans => ans.length > 0)
        }

        // Remove correctAnswers and convert null to undefined for API compatibility
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { correctAnswers: _correctAnswers, frontImageUrl, backImageUrl, ...rest } = cardData
        
        const apiData: ApiCardData = {
          ...rest,
          ...(frontImageUrl !== null && frontImageUrl !== undefined ? { frontImageUrl } : {}),
          ...(backImageUrl !== null && backImageUrl !== undefined ? { backImageUrl } : {}),
        }

        cardsToCreate.push(apiData)
      }

      // Step 3: Batch create all cards at once (super fast!)
      if (cardsToCreate.length > 0) {
        console.log(`⚡ Batch creating ${cardsToCreate.length} cards...`)
        const createdCards = await api.createCardsBatch(accessToken, selectedDeckId, cardsToCreate)
        
        // Add all cards to local state
        if (createdCards && Array.isArray(createdCards)) {
          createdCards.forEach((card: any) => {
            addCard(card)
          })
          console.log(`✅ Successfully batch created ${createdCards.length} cards`)
        } else {
          throw new Error('Invalid response from batch create')
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
        toast.error(`Failed to add ${failCount} ${failCount === 1 ? 'card' : 'cards'} due to image upload errors`)
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
    
    const result = await api.translateText(accessToken, text, language)
    return result.translatedText
  }

  // Image upload wrapper for bulk add
  const handleBulkImageUpload = async (file: File): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated')
    
    const imageUrl = await api.uploadCardImage(accessToken, file)
    return imageUrl
  }

  // Audio upload wrapper for bulk add
  const handleBulkAudioUpload = async (file: File): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated')
    
    const audioUrl = await api.uploadCardAudio(accessToken, file)
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
            frontAudioUrl={newCardFrontAudioUrl}
            backAudioUrl={newCardBackAudioUrl}
            options={newCardOptions}
            correctIndices={newCardCorrectIndices}
            acceptedAnswers={newCardAcceptedAnswers}
            creating={creating}
            uploadingImage={uploadingImage}
            uploadingBackImage={uploadingBackImage}
            userTier={user?.subscriptionTier}
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
            onFrontAudioChange={setNewCardFrontAudioUrl}
            onBackAudioChange={setNewCardBackAudioUrl}
            onOptionsChange={setNewCardOptions}
            onCorrectIndicesChange={setNewCardCorrectIndices}
            onAcceptedAnswersChange={setNewCardAcceptedAnswers}
            onSubmit={handleCreateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            onTranslateFront={handleTranslateFront}
            onTranslateBack={handleTranslateBack}
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
            frontAudioUrl={editCardFrontAudioUrl}
            backAudioUrl={editCardBackAudioUrl}
            options={editCardOptions}
            correctIndices={editCardCorrectIndices}
            acceptedAnswers={editCardAcceptedAnswers}
            updating={updating}
            uploadingImage={uploadingEditImage}
            uploadingBackImage={uploadingEditBackImage}
            userTier={user?.subscriptionTier}
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
            onFrontAudioChange={setEditCardFrontAudioUrl}
            onBackAudioChange={setEditCardBackAudioUrl}
            onOptionsChange={setEditCardOptions}
            onCorrectIndicesChange={setEditCardCorrectIndices}
            onAcceptedAnswersChange={setEditCardAcceptedAnswers}
            onSubmit={handleUpdateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            onTranslateFront={handleTranslateEditFront}
            onTranslateBack={handleTranslateEditBack}
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
            onToggleSelectionMode={handleToggleSelectionMode}
            onToggleCardSelection={handleToggleCardSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkDelete={handleBulkDelete}
            selectedCards={selectedCards}
          />
        </div>
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </AppLayout>
  )
}