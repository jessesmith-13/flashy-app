import { useEffect, useState } from 'react'
import { useStore, CardType, CommunityDeck } from '../../../../store/useStore'
import { useNavigation } from '../../../../hooks/useNavigation'
import * as api from '../../../../utils/api'
import { AppLayout } from '../../Layout/AppLayout'
import { DeckHeader } from './DeckHeader'
import { AddCardModal } from './AddCardModal'
import { EditCardModal } from './EditCardModal'
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
  } = useStore()
  const { navigateTo } = useNavigation()

  const deck = decks.find((d) => d.id === selectedDeckId)
  const deckCards = cards.filter((c) => c.deckId === selectedDeckId)

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
  const [newCardOptions, setNewCardOptions] = useState<string[]>(['', ''])
  const [newCardCorrectIndices, setNewCardCorrectIndices] = useState<number[]>([0])
  const [newCardAcceptedAnswers, setNewCardAcceptedAnswers] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBackImage, setUploadingBackImage] = useState(false)

  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editCardType, setEditCardType] = useState<CardType>('classic-flip')
  const [editCardFront, setEditCardFront] = useState('')
  const [editCardBack, setEditCardBack] = useState('')
  const [editCardFrontImageUrl, setEditCardFrontImageUrl] = useState('')
  const [editCardImageFile, setEditCardImageFile] = useState<File | null>(null)
  const [editCardBackImageUrl, setEditCardBackImageUrl] = useState('')
  const [editCardBackImageFile, setEditCardBackImageFile] = useState<File | null>(null)
  const [editCardOptions, setEditCardOptions] = useState<string[]>(['', ''])
  const [editCardCorrectIndices, setEditCardCorrectIndices] = useState<number[]>([0])
  const [editCardAcceptedAnswers, setEditCardAcceptedAnswers] = useState('')
  const [updating, setUpdating] = useState(false)
  const [uploadingEditImage, setUploadingEditImage] = useState(false)
  const [uploadingEditBackImage, setUploadingEditBackImage] = useState(false)

  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSubtopic, setEditSubtopic] = useState('')
  const [editDifficulty, setEditDifficulty] = useState('')
  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [communityDeckAuthor, setCommunityDeckAuthor] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (deck) {
      setEditName(deck.name)
      setEditEmoji(deck.emoji)
      setEditColor(deck.color)
      setEditCategory(deck.category || '')
      setEditSubtopic(deck.subtopic || '')
      setEditDifficulty(deck.difficulty || '')
      
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

      if (newCardType === 'type-answer' && newCardAcceptedAnswers.trim()) {
        cardData.acceptedAnswers = newCardAcceptedAnswers
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
      const { correctAnswers: _correctAnswers, frontImageUrl, backImageUrl, ...rest } = cardData
      
      const apiData: ApiCardData = {
        ...rest,
        ...(frontImageUrl !== null && frontImageUrl !== undefined ? { frontImageUrl } : {}),
        ...(backImageUrl !== null && backImageUrl !== undefined ? { backImageUrl } : {}),
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
          toast.info(error.message)
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
              if (!canPublishToCommunity(user?.subscriptionTier)) {
                setUpgradeModalOpen(true)
              } else {
                setPublishDialogOpen(true)
              }
            }}
            onDelete={handleDeleteDeck}
            onStartStudy={handleStartStudy}
            onAddCard={() => setCreateDialogOpen(true)}
            onAIGenerate={() => navigateTo('ai-generate')}
            deleting={deleting}
            canPublish={canPublishToCommunity(user?.subscriptionTier)}
            communityDeckAuthor={communityDeckAuthor}
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
            onNameChange={setEditName}
            onEmojiChange={setEditEmoji}
            onColorChange={setEditColor}
            onCategoryChange={setEditCategory}
            onSubtopicChange={setEditSubtopic}
            onDifficultyChange={setEditDifficulty}
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
            onOptionsChange={setNewCardOptions}
            onCorrectIndicesChange={setNewCardCorrectIndices}
            onAcceptedAnswersChange={setNewCardAcceptedAnswers}
            onSubmit={handleCreateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
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
            onOptionsChange={setEditCardOptions}
            onCorrectIndicesChange={setEditCardCorrectIndices}
            onAcceptedAnswersChange={setEditCardAcceptedAnswers}
            onSubmit={handleUpdateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
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