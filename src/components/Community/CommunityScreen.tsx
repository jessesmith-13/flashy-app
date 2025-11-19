import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import * as api from '../../../utils/api'
import { toast } from 'sonner'
import { canImportCommunityDecks, canPublishToCommunity } from '../../../utils/subscription'
import { useIsSuperuser } from '../../../utils/userUtils'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Label } from '../../ui/label'
import { Upload } from 'lucide-react'
import { CommunityDeckGrid } from './CommunityDeckGrid'
import { CommunityDeckDetail } from './CommunityDeckDetail'
import { CommunityFilters } from './CommunityFilters'
import { UserProfileView } from './UserProfileView'
import { UserDeckViewer } from './UserDeckViewer'
import { Pagination } from '../Pagination/Pagination'
import { UpgradeModal } from '../UpgradeModal'
import { FlagReportDialog } from './FlagReportDialog'

interface Card {
  id: string
  front: string
  back: string
  deckId: string
}

interface Deck {
  id: string
  name: string
  emoji: string
  color: string
  cardCount: number
  category?: string
  subtopic?: string
  sourceCommunityDeckId?: string
  communityPublishedId?: string
}

interface CommunityDeck {
  id: string
  name: string
  emoji: string
  color: string
  author: string
  authorId: string
  downloads: number
  rating: number
  ratingCount: number
  cards: Card[]
  category: string
  subtopic: string
  featured?: boolean
  publishedAt?: string
  version?: number
}

export function CommunityScreen() {
  const { user, accessToken, addDeck, updateDeck, decks, setTemporaryStudyDeck, setReturnToCommunityDeck, setReturnToUserDeck, returnToCommunityDeck, returnToUserDeck, viewingCommunityDeckId, setViewingCommunityDeckId, targetCommentId, setTargetCommentId, viewingUserId, setViewingUserId, userProfileReturnView, setUserProfileReturnView } = useStore()
  const { navigateTo } = useNavigation()
  const isSuperuser = useIsSuperuser()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [viewingUserDeck, setViewingUserDeck] = useState<{ deck: Deck; cards: Card[]; ownerId: string } | null>(null)
  const [addingDeckId, setAddingDeckId] = useState<string | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>()
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [viewingDeck, setViewingDeck] = useState<CommunityDeck | null>(null)
  const [communityDecks, setCommunityDecks] = useState<CommunityDeck[]>([])
  const [featuredDecks, setFeaturedDecks] = useState<CommunityDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [searchedUsers, setSearchedUsers] = useState<{ id: string; name: string; deckCount: number }[]>([])
  
  // Superuser state
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)
  const [featuringDeckId, setFeaturingDeckId] = useState<string | null>(null)
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterSubtopic, setFilterSubtopic] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [showFlashyDecksOnly, setShowFlashyDecksOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [deckDetailPage, setDeckDetailPage] = useState(1)
  const ITEMS_PER_PAGE = 12
  const CARDS_PER_PAGE = 20

  // Flag/Report state
  const [flagDialogOpen, setFlagDialogOpen] = useState(false)
  const [flagItemType, setFlagItemType] = useState<'deck' | 'card'>('deck')
  const [flagItemId, setFlagItemId] = useState('')
  const [flagItemName, setFlagItemName] = useState('')
  const [flaggedDecks, setFlaggedDecks] = useState<Set<string>>(new Set())
  const [flaggedCards, setFlaggedCards] = useState<Set<string>>(new Set())

  // Fetch community decks on mount
  useEffect(() => {
    loadCommunityDecks()
  }, [])

  // Restore viewing deck when returning from study
  useEffect(() => {
    if (returnToCommunityDeck) {
      setViewingDeck(returnToCommunityDeck)
    }
    if (returnToUserDeck) {
      setViewingUserDeck(returnToUserDeck)
    }
  }, [])

  // Reset to page 1 when filters or sorting changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterCategory, filterSubtopic, sortBy, showFeaturedOnly, showFlashyDecksOnly])

  // Search for users when search query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length >= 2) {
        try {
          const users = await api.searchCommunityUsers(searchQuery)
          setSearchedUsers(users)
        } catch (error) {
          console.error('Failed to search users:', error)
          setSearchedUsers([])
        }
      } else {
        setSearchedUsers([])
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Reset deck detail page when viewing a new deck
  useEffect(() => {
    setDeckDetailPage(1)
  }, [viewingDeck?.id])

  // Listen for custom event to view user profile
  useEffect(() => {
    const handleViewUserProfile = (event: any) => {
      if (event.detail?.userId) {
        setSelectedUserId(event.detail.userId)
      }
    }
    
    window.addEventListener('viewUserProfile', handleViewUserProfile)
    
    return () => {
      window.removeEventListener('viewUserProfile', handleViewUserProfile)
    }
  }, [])

  // Watch for viewingUserId from Zustand store
  useEffect(() => {
    if (viewingUserId) {
      setSelectedUserId(viewingUserId)
      setViewingUserId(null) // Clear the store after using it
    }
  }, [viewingUserId, setViewingUserId])

  // Listen for notification-triggered deck viewing
  useEffect(() => {
    if (viewingCommunityDeckId && communityDecks.length > 0) {
      const deckToView = communityDecks.find(d => d.id === viewingCommunityDeckId)
      if (deckToView) {
        setViewingDeck(deckToView)
        setViewingCommunityDeckId(null) // Reset after setting
      } else {
        // Deck not found in current list, try fetching it directly
        fetchDeckById(viewingCommunityDeckId)
      }
    }
  }, [viewingCommunityDeckId, communityDecks])

  const fetchDeckById = async (deckId: string) => {
    try {
      // Fetch the deck from the API
      const deck = await api.getCommunityDeck(deckId)
      if (deck) {
        setViewingDeck(deck)
        setViewingCommunityDeckId(null) // Reset after setting
      } else {
        toast.error('Deck not found')
        setViewingCommunityDeckId(null)
      }
    } catch (error) {
      console.error('Failed to fetch deck:', error)
      toast.error('Failed to load deck')
      setViewingCommunityDeckId(null)
    }
  }

  const loadCommunityDecks = async () => {
    try {
      const [publishedDecks, featuredPublishedDecks] = await Promise.all([
        api.fetchCommunityDecks(),
        api.fetchFeaturedCommunityDecks()
      ])
      
      // Use only real published decks
      const allDecks = publishedDecks
      
      // Get all deck IDs
      const allDeckIds = allDecks.map(d => d.id)
      
      // Get download counts for all decks
      const downloadCounts = await api.fetchDownloadCounts(allDeckIds)
      
      // Get ratings for all decks
      const ratingsPromises = allDeckIds.map(id => 
        api.getDeckRatings(id).catch(() => ({ averageRating: 0, totalRatings: 0, userRating: null }))
      )
      const ratingsData = await Promise.all(ratingsPromises)
      const ratingsMap = allDeckIds.reduce((acc, id, index) => {
        acc[id] = ratingsData[index]
        return acc
      }, {} as Record<string, any>)
      
      // Update decks with real download counts and ratings
      const updatedDecks = allDecks.map(deck => ({
        ...deck,
        downloads: downloadCounts[deck.id] || deck.downloads || 0,
        rating: ratingsMap[deck.id]?.averageRating || 0,
        ratingCount: ratingsMap[deck.id]?.totalRatings || 0
      }))
      
      // Update featured decks with ratings and download counts
      const updatedFeaturedDecks = featuredPublishedDecks.map((deck: any) => ({
        ...deck,
        downloads: downloadCounts[deck.id] || deck.downloads || 0,
        rating: ratingsMap[deck.id]?.averageRating || 0,
        ratingCount: ratingsMap[deck.id]?.totalRatings || 0
      }))
      
      setCommunityDecks(updatedDecks)
      setFeaturedDecks(updatedFeaturedDecks)
    } catch (error) {
      console.error('Failed to load community decks:', error)
      // Set empty arrays on error
      setCommunityDecks([])
      setFeaturedDecks([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddDeck = async (deck: any) => {
    if (!accessToken) {
      toast.error('Please log in to add decks')
      return
    }

    // Check if user can import community decks
    if (!canImportCommunityDecks(user?.subscriptionTier, isSuperuser)) {
      setUpgradeFeature('importing Community decks')
      setUpgradeModalOpen(true)
      return
    }

    // Check if deck is already imported
    const alreadyImported = decks.find(d => d.sourceCommunityDeckId === deck.id)
    if (alreadyImported) {
      toast.info('You have already added this deck to your collection')
      return
    }

    setAddingDeckId(deck.id)
    try {
      const newDeck = await api.addDeckFromCommunity(accessToken, {
        communityDeckId: deck.id,
        name: deck.name,
        color: deck.color,
        emoji: deck.emoji,
        cards: deck.cards || [],
        category: deck.category,
        subtopic: deck.subtopic,
        version: deck.version || 1,
      })

      addDeck(newDeck)
      
      // Reload community decks to show updated download count
      await loadCommunityDecks()
      
      // Update viewingDeck if it's the same deck we just added
      if (viewingDeck && viewingDeck.id === deck.id) {
        setViewingDeck({
          ...viewingDeck,
          downloads: (viewingDeck.downloads || 0) + 1
        })
      }
      
      toast.success(`"${deck.name}" added to your decks!`)
    } catch (error: any) {
      console.error('Failed to add deck:', error)
      if (error.message.includes('already added')) {
        toast.info(error.message)
      } else {
        toast.error('Failed to add deck')
      }
    } finally {
      setAddingDeckId(null)
    }
  }

  const handleUpdateDeck = async (communityDeck: any, importedDeck: any) => {
    if (!accessToken) {
      toast.error('Please login to update decks')
      return
    }

    setAddingDeckId(communityDeck.id)
    try {
      const updatedDeck = await api.updateImportedDeck(accessToken, importedDeck.id, {
        name: communityDeck.name,
        color: communityDeck.color,
        emoji: communityDeck.emoji,
        cards: communityDeck.cards || [],
        category: communityDeck.category,
        subtopic: communityDeck.subtopic,
        version: communityDeck.version || 1,
      })

      updateDeck(updatedDeck)
      toast.success(`\"${communityDeck.name}\" updated to version ${communityDeck.version}!`)
    } catch (error: any) {
      console.error('Failed to update deck:', error)
      toast.error('Failed to update deck')
    } finally {
      setAddingDeckId(null)
    }
  }

  const handlePublishDeck = async () => {
    if (!accessToken || !selectedDeckId) {
      toast.error('Please select a deck')
      return
    }

    // Get the selected deck
    const selectedDeck = decks.find(d => d.id === selectedDeckId)
    
    if (!selectedDeck) {
      toast.error('Deck not found')
      return
    }
    
    // Prevent publishing imported decks
    if (selectedDeck.sourceCommunityDeckId) {
      toast.error('Cannot publish decks imported from the community. Only decks you created can be published.')
      return
    }
    
    if (!selectedDeck.category || !selectedDeck.subtopic) {
      toast.error('Please set a category and subtopic in deck settings first')
      return
    }

    if (selectedDeck.cardCount < 10) {
      toast.error('Deck must have at least 10 cards to be published')
      return
    }

    setPublishing(true)
    try {
      const result = await api.publishDeckToCommunity(accessToken, {
        deckId: selectedDeckId,
        category: selectedDeck.category,
        subtopic: selectedDeck.subtopic,
      })
      
      if (result.updated) {
        toast.success('Deck updated successfully!')
      } else {
        toast.success('Deck published to community!')
      }
      
      // Update the deck in the local store with the published ID
      const publishedDeck = result.publishedDeck
      if (publishedDeck && publishedDeck.id) {
        updateDeck(selectedDeckId, { 
          communityPublishedId: publishedDeck.id 
        })
      }
      
      setPublishDialogOpen(false)
      setSelectedDeckId('')
      
      // Reload community decks to show the newly published deck
      await loadCommunityDecks()
    } catch (error: any) {
      console.error('Failed to publish deck:', error)
      if (error.message.includes('already been published')) {
        toast.info(error.message)
      } else if (error.message.includes('10 cards')) {
        toast.error(error.message)
      } else {
        toast.error(error.message || 'Failed to publish deck')
      }
    } finally {
      setPublishing(false)
    }
  }

  const handleViewDeckFromProfile = async (deckId: string, userId: string) => {
    try {
      if (!accessToken) {
        toast.error('Please log in to view decks')
        return
      }

      // Fetch the user's deck
      const {deck, cards} = await api.getUserDeck(accessToken, userId, deckId)
      
      // Set viewing user deck
      setViewingUserDeck({ deck, cards, ownerId: userId })
      setSelectedUserId(null) // Clear the profile view
    } catch (error: any) {
      console.error('Failed to load user deck:', error)
      toast.error(error.message || 'Failed to load deck')
    }
  }

  const handleFlagItem = async (itemId: string, reason: string, details: string) => {
    try {
      // API call to flag the item
      await api.flagCommunityItem(accessToken, {
        itemType: flagItemType,
        itemId,
        reason,
        details
      })

      // Track flagged items locally
      if (flagItemType === 'deck') {
        setFlaggedDecks(prev => new Set(prev).add(itemId))
      } else {
        setFlaggedCards(prev => new Set(prev).add(itemId))
      }
    } catch (error) {
      console.error('Failed to flag item:', error)
      throw error
    }
  }

  const openFlagDialog = (type: 'deck' | 'card', id: string, name: string) => {
    setFlagItemType(type)
    setFlagItemId(id)
    setFlagItemName(name)
    setFlagDialogOpen(true)
  }

  const handleDeleteCommunityDeck = async (deckId: string, deckName: string) => {
    if (!accessToken || !isSuperuser) {
      toast.error('Unauthorized')
      return
    }

    if (!confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingDeckId(deckId)
    try {
      await api.deleteCommunityDeck(accessToken, deckId)
      toast.success('Community deck deleted successfully')
      
      // Reload community decks
      await loadCommunityDecks()
      
      // If we're viewing this deck, go back to the list
      if (viewingDeck && viewingDeck.id === deckId) {
        setViewingDeck(null)
        setReturnToCommunityDeck(null)
      }
    } catch (error: any) {
      console.error('Failed to delete community deck:', error)
      toast.error(error.message || 'Failed to delete community deck')
    } finally {
      setDeletingDeckId(null)
    }
  }

  const handleToggleFeatured = async (deckId: string) => {
    if (!accessToken || !isSuperuser) {
      toast.error('Unauthorized')
      return
    }

    setFeaturingDeckId(deckId)
    try {
      const result = await api.toggleCommunityDeckFeatured(accessToken, deckId)
      toast.success(result.message)
      
      // Reload community decks
      await loadCommunityDecks()
      
      // Update viewing deck if it's the same one
      if (viewingDeck && viewingDeck.id === deckId) {
        setViewingDeck(result.deck)
      }
    } catch (error: any) {
      console.error('Failed to toggle featured status:', error)
      toast.error(error.message || 'Failed to toggle featured status')
    } finally {
      setFeaturingDeckId(null)
    }
  }

  const handleStudyDeck = (deck: any) => {
    setTemporaryStudyDeck({
      deck: deck,
      cards: deck.cards
    })
    setReturnToCommunityDeck(deck)
    navigateTo('study')
  }

  // If viewing a user profile, show that instead
  if (selectedUserId) {
    return <UserProfileView 
      userId={selectedUserId} 
      onBack={() => {
        // Check if we should return to profile or community
        if (userProfileReturnView === 'profile') {
          navigateTo('profile')
          setUserProfileReturnView(null) // Clear the return view
        }
        setSelectedUserId(null)
      }} 
      onViewDeck={handleViewDeckFromProfile} 
      onViewUser={setSelectedUserId} 
    />
  }

  // If viewing a user deck (read-only), show that
  if (viewingUserDeck) {
    return (
      <UserDeckViewer
        deck={viewingUserDeck.deck}
        cards={viewingUserDeck.cards}
        ownerId={viewingUserDeck.ownerId}
        isOwner={user?.id === viewingUserDeck.ownerId}
        onBack={() => {
          setSelectedUserId(viewingUserDeck.ownerId)
          setViewingUserDeck(null)
          setReturnToUserDeck(null) // Clear return state
        }}
        onStudy={(deck, cards) => {
          setTemporaryStudyDeck({ deck, cards })
          setReturnToUserDeck(viewingUserDeck)
          navigateTo('study')
        }}
      />
    )
  }

  // If viewing a deck, show deck details
  if (viewingDeck) {
    return (
      <CommunityDeckDetail
        deck={viewingDeck}
        userDecks={decks}
        isSuperuser={isSuperuser}
        addingDeckId={addingDeckId}
        deletingDeckId={deletingDeckId}
        featuringDeckId={featuringDeckId}
        deckDetailPage={deckDetailPage}
        cardsPerPage={CARDS_PER_PAGE}
        flaggedDecks={flaggedDecks}
        flaggedCards={flaggedCards}
        targetCommentId={targetCommentId}
        onBack={() => {
          setViewingDeck(null)
          setReturnToCommunityDeck(null)
          setTargetCommentId(null) // Clear target comment when leaving deck view
        }}
        onViewUser={setSelectedUserId}
        onAddDeck={handleAddDeck}
        onUpdateDeck={handleUpdateDeck}
        onToggleFeatured={handleToggleFeatured}
        onDeleteDeck={handleDeleteCommunityDeck}
        onFlagDeck={openFlagDialog}
        onFlagCard={openFlagDialog}
        onStudyDeck={handleStudyDeck}
        onDeckDetailPageChange={setDeckDetailPage}
        onRatingChange={loadCommunityDecks}
      />
    )
  }

  // Filter and sort decks
  let filteredDecks = communityDecks.filter((deck) => {
    const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.subtopic.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = filterCategory === 'all' || deck.category === filterCategory
    const matchesSubtopic = filterSubtopic === 'all' || deck.subtopic === filterSubtopic
    const matchesFeatured = !showFeaturedOnly || deck.featured === true
    const matchesFlashy = !showFlashyDecksOnly || deck.author === 'Flashy'

    return matchesSearch && matchesCategory && matchesSubtopic && matchesFeatured && matchesFlashy
  })

  // Sort decks
  filteredDecks = [...filteredDecks].sort((a, b) => {
    if (sortBy === 'popular') return b.downloads - a.downloads
    if (sortBy === 'rating') {
      const ratingA = a.rating || 0
      const ratingB = b.rating || 0
      // Sort by rating descending, then by number of ratings as tiebreaker
      if (ratingB !== ratingA) return ratingB - ratingA
      return (b.ratingCount || 0) - (a.ratingCount || 0)
    }
    if (sortBy === 'newest') {
      // Sort by publishedAt timestamp, newest first
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return dateB - dateA
    }
    return 0
  })

  // If showing featured decks, exclude them from the main grid to avoid duplication
  const showingFeaturedSection = featuredDecks.length > 0 && !searchQuery && filterCategory === 'all' && !showFeaturedOnly
  const decksForGrid = showingFeaturedSection 
    ? filteredDecks.filter(deck => !featuredDecks.some(fd => fd.id === deck.id))
    : filteredDecks

  // Pagination
  const totalPages = Math.ceil(decksForGrid.length / ITEMS_PER_PAGE)
  const paginatedDecks = decksForGrid.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Only show user-created decks (not imported from community)
  const publishableDecks = decks.filter(d => !d.sourceCommunityDeckId && d.cardCount > 0)

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">Loading community decks...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Community Decks</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Discover and share decks with learners worldwide</p>
              </div>
              
              {/* Publish Deck Button */}
              <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10"
                    onClick={(e) => {
                      if (!canPublishToCommunity(user?.subscriptionTier, isSuperuser)) {
                        e.preventDefault()
                        setUpgradeFeature('community publishing')
                        setUpgradeModalOpen(true)
                      }
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Publish Deck
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Publish Deck to Community</DialogTitle>
                    <DialogDescription>
                      Share your deck with the community
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="deck">Select Deck</Label>
                      <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a deck..." />
                        </SelectTrigger>
                        <SelectContent>
                          {publishableDecks.map(deck => (
                            <SelectItem 
                              key={deck.id} 
                              value={deck.id} 
                              disabled={deck.cardCount < 10 || !deck.category || !deck.subtopic}
                            >
                              {deck.emoji} {deck.name} ({deck.cardCount} cards)
                              {deck.communityPublishedId ? ' • Published' : ''}
                              {deck.cardCount < 10 ? ' • Needs 10+ cards' : ''}
                              {!deck.category || !deck.subtopic ? ' • Needs category' : ''}
                            </SelectItem>
                          ))}
                          {publishableDecks.length === 0 && (
                            <div className="px-2 py-1 text-sm text-gray-500">
                              No decks available to publish. Create a deck with 10+ cards and set its category.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedDeckId && (() => {
                      const selectedDeck = decks.find(d => d.id === selectedDeckId)
                      if (!selectedDeck) return null
                      
                      return (
                        <>
                          {selectedDeck.category && selectedDeck.subtopic ? (
                            <>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                    style={{ backgroundColor: selectedDeck.color }}
                                  >
                                    {selectedDeck.emoji}
                                  </div>
                                  <div>
                                    <h3 className="font-medium dark:text-gray-100">{selectedDeck.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {selectedDeck.cardCount} {selectedDeck.cardCount === 1 ? 'card' : 'cards'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                    {selectedDeck.category}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    {selectedDeck.subtopic}
                                  </span>
                                </div>
                              </div>
                              
                              {selectedDeck.communityPublishedId && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  This deck is already published. Publishing again will update it with your latest changes.
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                This deck needs a category and subtopic. Please edit the deck to set these before publishing.
                              </p>
                            </div>
                          )}
                        </>
                      )
                    })()}

                    <Button
                      onClick={handlePublishDeck}
                      disabled={publishing || !selectedDeckId}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {publishing ? 'Publishing...' : (() => {
                        const selectedDeck = decks.find(d => d.id === selectedDeckId)
                        return selectedDeck?.communityPublishedId ? 'Update Published Deck' : 'Publish to Community'
                      })()}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Search and Filters */}
            <CommunityFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterCategory={filterCategory}
              onCategoryChange={setFilterCategory}
              filterSubtopic={filterSubtopic}
              onSubtopicChange={setFilterSubtopic}
              sortBy={sortBy}
              onSortChange={setSortBy}
              showFeaturedOnly={showFeaturedOnly}
              onToggleFeatured={() => setShowFeaturedOnly(!showFeaturedOnly)}
              showFlashyDecksOnly={showFlashyDecksOnly}
              onToggleFlashy={() => setShowFlashyDecksOnly(!showFlashyDecksOnly)}
            />
          </div>

          {/* User Search Results */}
          {searchedUsers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Users</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchedUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.deckCount} {user.deckCount === 1 ? 'deck' : 'decks'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Decks Grid */}
          <CommunityDeckGrid
            decks={paginatedDecks}
            featuredDecks={featuredDecks}
            showFeaturedSection={showingFeaturedSection}
            showFeaturedOnly={showFeaturedOnly}
            searchQuery={searchQuery}
            filterCategory={filterCategory}
            userDecks={decks}
            isSuperuser={isSuperuser}
            addingDeckId={addingDeckId}
            deletingDeckId={deletingDeckId}
            featuringDeckId={featuringDeckId}
            onViewDeck={setViewingDeck}
            onViewUser={setSelectedUserId}
            onAddDeck={handleAddDeck}
            onUpdateDeck={handleUpdateDeck}
            onToggleFeatured={handleToggleFeatured}
            onDeleteDeck={handleDeleteCommunityDeck}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <UpgradeModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
      />

      <FlagReportDialog
        open={flagDialogOpen}
        onOpenChange={setFlagDialogOpen}
        itemType={flagItemType}
        itemId={flagItemId}
        itemName={flagItemName}
        onFlagSubmit={handleFlagItem}
      />
    </AppLayout>
  )
}