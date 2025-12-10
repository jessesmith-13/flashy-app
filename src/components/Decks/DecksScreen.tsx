import { useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import * as api from '../../../utils/api'
import { projectId } from '../../../utils/supabase/info'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { Pagination } from '../Pagination/Pagination'
import { Input } from '../../ui/input'
import { Plus, BookOpen, GripVertical, Trash2, Star, CheckCircle, ArrowUpDown, Search, X, Filter, FileEdit, Crown, Download, User, Share2, Upload, EyeOff } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { toast } from 'sonner'
import { DECK_CATEGORIES } from '../../../utils/categories'
import { ShareDeckDialog } from '../ShareDeckDialog'
import { CreateDeckDialog } from './DeckDetail/CreateDeckDialog'
import { EditDeckDialog } from './DeckDetail/EditDeckDialog'

type SortOption = 'custom' | 'alphabetical-asc' | 'alphabetical-desc' | 'newest' | 'oldest' | 'recently-studied' | 'most-studied' | 'least-studied'

import { UpgradeModal } from '../UpgradeModal'
import { canCreateDeck, isPremiumUser, canPublishToCommunity } from '../../../utils/subscription'
import { useIsSuperuser } from '../../../utils/userUtils'

export function DecksScreen() {
  const { user, accessToken, decks, setDecks, addDeck, updateDeck, removeDeck, setSelectedDeckId, userAchievements, setUserAchievements, studySessions, setStudySessions, shouldReloadDecks, invalidateDecksCache } = useStore()
  const { navigateTo, navigate } = useNavigation()
  const isSuperuser = useIsSuperuser()
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>()
  const [draggedDeck, setDraggedDeck] = useState<string | null>(null)
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)
  const [unpublishingDeckId, setUnpublishingDeckId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'learned' | 'added' | 'created' | 'published'>('all')
  const [sortOption, setSortOption] = useState<SortOption>('custom')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterSubtopic, setFilterSubtopic] = useState<string>('all')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharingDeck, setSharingDeck] = useState<any>(null)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishingDeck, setPublishingDeck] = useState<any>(null)
  const [publishing, setPublishing] = useState(false)
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false)
  const [unpublishingDeck, setUnpublishingDeck] = useState<any>(null)

  useEffect(() => {
    loadDecks()
    loadAchievements()
    loadStudySessions()
  }, [])

  const loadDecks = async () => {
    if (!accessToken || !user) {
      setLoading(false)
      return
    }
    
    // Check if we need to reload decks
    if (!shouldReloadDecks()) {
      console.log('📦 Using cached decks, skipping reload')
      setLoading(false)
      return
    }
    
    console.log('🔄 Cache stale or invalidated, reloading decks...')
    try {
      const fetchedDecks = await api.fetchDecks(accessToken)
      setDecks(fetchedDecks)
    } catch (error) {
      console.error('Failed to load decks:', error)
      // Don't show error toast on initial mount - user might not be logged in yet
      if (accessToken && user) {
        toast.error('Failed to load decks. Please try refreshing the page.')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAchievements = async () => {
    if (!accessToken) return
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a1502a9/achievements`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.achievements) {
          setUserAchievements(data.achievements)
        }
      }
    } catch (error) {
      console.error('Failed to load achievements:', error)
    }
  }

  const loadStudySessions = async () => {
    if (!accessToken) return
    
    try {
      const sessions = await api.fetchStudySessions(accessToken)
      setStudySessions(sessions)
      console.log('Loaded study sessions:', sessions.length)
    } catch (error) {
      console.error('Failed to load study sessions:', error)
    }
  }

  const handleCreateDeckClick = () => {
    // Check if user can create more decks
    if (!canCreateDeck(decks.length, user?.subscriptionTier, isSuperuser)) {
      setUpgradeFeature('unlimited decks')
      setUpgradeModalOpen(true)
      return
    }
    setCreateDialogOpen(true)
  }

  const handleCreateDeck = async (data: {
    name: string
    emoji: string
    color: string
    category?: string
    subtopic?: string
    difficulty?: string
  }) => {
    if (!accessToken) return

    const deck = await api.createDeck(accessToken, data)
    addDeck(deck)
    
    // Track deck customization achievement
    if ((data.emoji !== '📚' || data.color !== '#10B981') && userAchievements) {
      setUserAchievements({
        ...userAchievements,
        customizedDeckTheme: true,
      })
    }
    
    toast.success('Deck created successfully!')
  }

  const handleDragStart = (deckId: string) => {
    setDraggedDeck(deckId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetDeckId: string) => {
    if (!draggedDeck || draggedDeck === targetDeckId || !accessToken) return

    const draggedIndex = decks.findIndex(d => d.id === draggedDeck)
    const targetIndex = decks.findIndex(d => d.id === targetDeckId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder decks array
    const newDecks = [...decks]
    const [removed] = newDecks.splice(draggedIndex, 1)
    newDecks.splice(targetIndex, 0, removed)

    // Update positions
    const updatedDecks = newDecks.map((deck, index) => ({
      ...deck,
      position: index,
    }))

    setDecks(updatedDecks)
    setDraggedDeck(null)

    // Update positions in backend
    try {
      await api.updateDeckPositions(accessToken, updatedDecks.map(d => ({ id: d.id, position: d.position })))
    } catch (error) {
      console.error('Failed to update deck positions:', error)
    }
  }

  const handleDeckClick = (deckId: string) => {
    setSelectedDeckId(deckId)
    // Navigate directly with deckId to avoid state update timing issues
    navigate(`/deck-detail/${deckId}`)
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (!accessToken) return

    setDeletingDeckId(deckId)
    try {
      const result = await api.deleteDeck(accessToken, deckId)
      removeDeck(deckId)
      
      // Show appropriate success message
      if (result.deletedFromCommunity) {
        toast.success('Deck deleted from your collection and unpublished from community')
      } else {
        toast.success('Deck deleted successfully')
      }
    } catch (error) {
      console.error('Failed to delete deck:', error)
      toast.error('Failed to delete deck')
    } finally {
      setDeletingDeckId(null)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation()
    if (!accessToken) return

    const deck = decks.find(d => d.id === deckId)
    if (!deck) return

    const newFavoriteStatus = !deck.favorite

    // Optimistically update UI
    updateDeck(deckId, { favorite: newFavoriteStatus })

    try {
      await api.updateDeck(accessToken, deckId, { favorite: newFavoriteStatus })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      // Revert on error
      updateDeck(deckId, { favorite: !newFavoriteStatus })
      toast.error('Failed to update favorite status')
    }
  }

  const handleToggleLearned = async (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation()
    if (!accessToken) return

    const deck = decks.find(d => d.id === deckId)
    if (!deck) return

    const newLearnedStatus = !deck.learned

    // Optimistically update UI
    updateDeck(deckId, { learned: newLearnedStatus })

    try {
      await api.updateDeck(accessToken, deckId, { learned: newLearnedStatus })
    } catch (error) {
      console.error('Failed to toggle learned:', error)
      // Revert on error
      updateDeck(deckId, { learned: !newLearnedStatus })
      toast.error('Failed to update learned status')
    }
  }

  const handlePublishToCommunity = async () => {
    if (!accessToken || !publishingDeck) return

    console.log('=== PUBLISH/UPDATE ATTEMPT ===')
    console.log('Deck ID:', publishingDeck.id)
    console.log('Deck name:', publishingDeck.name)
    console.log('Has communityPublishedId:', !!publishingDeck.communityPublishedId)
    console.log('communityPublishedId value:', publishingDeck.communityPublishedId)
    console.log('Card count:', publishingDeck.cardCount)

    // Validate minimum card count
    if (!publishingDeck.cardCount || publishingDeck.cardCount === 0) {
      toast.error('Cannot publish an empty deck')
      setPublishDialogOpen(false)
      return
    }

    if (publishingDeck.cardCount < 10) {
      toast.error('Deck must have at least 10 cards to be published')
      setPublishDialogOpen(false)
      return
    }

    setPublishing(true)
    try {
      // Publish to community using the correct API format
      const result = await api.publishDeckToCommunity(accessToken, {
        deckId: publishingDeck.id,
        category: publishingDeck.category,
        subtopic: publishingDeck.subtopic,
      })

      // Update local deck with community reference and version
      updateDeck(publishingDeck.id, {
        communityPublishedId: result.publishedDeck?.id,
        communityDeckVersion: result.publishedDeck?.version,
      })

      if (result.updated) {
        toast.success('Published deck updated successfully!')
      } else {
        toast.success('Deck published to community successfully!')
      }
      setPublishDialogOpen(false)
      setPublishingDeck(null)
    } catch (error: any) {
      console.error('Failed to publish deck:', error)
      if (error.message?.includes('already been published')) {
        // Just show the info message, don't show error
        toast.info('This deck is already published with no changes. Make edits to the deck to publish an update.')
      } else {
        toast.error(error.message || 'Failed to publish deck to community')
      }
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublishDeck = async (e: React.MouseEvent, deckId: string, deckName: string, communityPublishedId: string) => {
    e.stopPropagation()
    if (!accessToken) {
      toast.error('Please log in to unpublish decks')
      return
    }

    // Open unpublish dialog
    const deck = decks.find(d => d.id === deckId)
    if (deck) {
      setUnpublishingDeck(deck)
      setUnpublishDialogOpen(true)
    }
  }

  const confirmUnpublish = async () => {
    if (!unpublishingDeck || !accessToken) return

    setUnpublishingDeckId(unpublishingDeck.id)
    try {
      await api.unpublishDeck(accessToken, unpublishingDeck.communityPublishedId)
      
      // Update local deck to remove community reference
      updateDeck(unpublishingDeck.id, {
        communityPublishedId: null
      })
      
      toast.success(`"${unpublishingDeck.name}" has been unpublished from the community`)
      setUnpublishDialogOpen(false)
      setUnpublishingDeck(null)
    } catch (error: any) {
      console.error('Failed to unpublish deck:', error)
      toast.error(error.message || 'Failed to unpublish deck')
    } finally {
      setUnpublishingDeckId(null)
    }
  }

  const handleOpenEditDialog = (e: React.MouseEvent, deck: any) => {
    e.stopPropagation()
    setEditingDeck(deck)
    setEditDialogOpen(true)
  }

  const handleUpdateDeck = async (data: {
    name: string
    emoji: string
    color: string
    category?: string
    subtopic?: string
    difficulty?: string
  }) => {
    if (!accessToken || !editingDeck) return

    // Update the local deck
    await api.updateDeck(accessToken, editingDeck.id, data)

    updateDeck(editingDeck.id, data)

    // If this is a deck the user created and published to community, also update the community version
    if (editingDeck.communityPublishedId && !editingDeck.sourceCommunityDeckId) {
      try {
        const deckCards = await api.fetchCards(accessToken, editingDeck.id)
        await api.updateCommunityDeck(accessToken, editingDeck.communityPublishedId, {
          ...data,
          cards: deckCards
        })
        toast.success('Deck and community version updated successfully!')
      } catch (communityError) {
        console.error('Failed to update community deck:', communityError)
        toast.success('Deck updated! (Community version update failed)')
      }
    } else {
      toast.success('Deck updated successfully!')
    }

    setEditingDeck(null)
  }

  // Filter decks based on active tab, search query, and category/subtopic
  const filteredDecks = decks.filter(deck => {
    // First filter by tab
    const tabFilter = (() => {
      if (activeTab === 'favorites') return deck.favorite
      if (activeTab === 'learned') return deck.learned
      if (activeTab === 'added') {
        // Imported from community AND not the user's own published deck
        return !!deck.sourceCommunityDeckId && !deck.communityPublishedId
      }
      if (activeTab === 'created') {
        // Created by user OR re-added their own published deck from community
        return !deck.sourceCommunityDeckId || !!deck.communityPublishedId
      }
      if (activeTab === 'published') return !!deck.communityPublishedId // Published to community
      return true // 'all' tab shows everything
    })()
    
    // Then filter by search query
    const searchFilter = searchQuery.trim() === '' || 
      deck.name.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by category
    const categoryFilter = filterCategory === 'all' || deck.category === filterCategory

    // Filter by subtopic
    const subtopicFilter = filterSubtopic === 'all' || deck.subtopic === filterSubtopic
    
    return tabFilter && searchFilter && categoryFilter && subtopicFilter
  })

  // Get study statistics for each deck
  const getDeckStudyStats = (deckId: string) => {
    const deckSessions = studySessions.filter(s => s.deckId === deckId)
    const studyCount = deckSessions.length
    const lastStudyDate = deckSessions.length > 0 
      ? Math.max(...deckSessions.map(s => new Date(s.date).getTime()))
      : 0
    return { studyCount, lastStudyDate }
  }

  // Sort decks based on selected option
  const sortedDecks = [...filteredDecks].sort((a, b) => {
    switch (sortOption) {
      case 'custom':
        return (a.position || 0) - (b.position || 0)
      case 'alphabetical-asc':
        return a.name.localeCompare(b.name)
      case 'alphabetical-desc':
        return b.name.localeCompare(a.name)
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'recently-studied': {
        const aStats = getDeckStudyStats(a.id)
        const bStats = getDeckStudyStats(b.id)
        return bStats.lastStudyDate - aStats.lastStudyDate
      }
      case 'most-studied': {
        const aStats = getDeckStudyStats(a.id)
        const bStats = getDeckStudyStats(b.id)
        return bStats.studyCount - aStats.studyCount
      }
      case 'least-studied': {
        const aStats = getDeckStudyStats(a.id)
        const bStats = getDeckStudyStats(b.id)
        return aStats.studyCount - bStats.studyCount
      }
      default:
        return (a.position || 0) - (b.position || 0)
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedDecks.length / ITEMS_PER_PAGE)
  const paginatedDecks = sortedDecks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <AppLayout>
      {loading ? (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">Loading My Flashcards...</div>
        </div>
      ) : (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-3 pt-5 pb-3 sm:px-6 sm:pt-6 lg:p-8 overflow-x-hidden">
        {/* Welcome Section */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-2 sm:gap-4">
          <div className="min-w-0 flex-shrink overflow-hidden">
            <h1 className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2 dark:text-gray-100 truncate">My Decks</h1>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base">Choose a deck to start studying</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {user?.subscriptionTier === 'free' && (
              <Button 
                onClick={() => navigateTo('upgrade')} 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-9 sm:h-10 lg:h-12 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm lg:text-base"
              >
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden lg:inline">Upgrade</span>
                <span className="lg:hidden">Pro</span>
              </Button>
            )}
            <Button onClick={handleCreateDeckClick} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 sm:h-10 lg:h-12 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm lg:text-base">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create New Deck</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>

          <CreateDeckDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreateDeck={handleCreateDeck}
          />
        </div>

        {/* Edit Deck Dialog */}
        <EditDeckDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          deck={editingDeck}
          onUpdateDeck={handleUpdateDeck}
        />

        {/* Search bar and filters */}
        <div className="mb-4 space-y-3 sm:space-y-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 pr-9 sm:pr-10 bg-white dark:bg-gray-800 w-full text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category and Subtopic Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <Select value={filterCategory} onValueChange={(value) => {
                setFilterCategory(value)
                setFilterSubtopic('all')
              }}>
                <SelectTrigger className="bg-white dark:bg-gray-800 text-sm sm:text-base w-full">
                  <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {DECK_CATEGORIES.map(cat => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filterCategory !== 'all' && (
              <div className="flex-1 min-w-0">
                <Select value={filterSubtopic} onValueChange={setFilterSubtopic}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 text-sm sm:text-base w-full">
                    <SelectValue placeholder="All Subtopics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subtopics</SelectItem>
                    {DECK_CATEGORIES.find(c => c.category === filterCategory)?.subtopics.map(subtopic => (
                      <SelectItem key={subtopic} value={subtopic}>
                        {subtopic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Tabs for filtering and sorting */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
          {/* Mobile: Dropdown Filter */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'favorites' | 'learned' | 'added' | 'created' | 'published')}>
              <SelectTrigger className="bg-white dark:bg-gray-800 text-sm w-full">
                <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All ({decks.length})
                </SelectItem>
                <SelectItem value="favorites">
                  Favorites ({decks.filter(d => d.favorite).length})
                </SelectItem>
                <SelectItem value="learned">
                  Learned ({decks.filter(d => d.learned).length})
                </SelectItem>
                <SelectItem value="added">
                  Added ({decks.filter(d => d.sourceCommunityDeckId && !d.communityPublishedId).length})
                </SelectItem>
                <SelectItem value="created">
                  Your Decks ({decks.filter(d => !d.sourceCommunityDeckId || d.communityPublishedId).length})
                </SelectItem>
                <SelectItem value="published">
                  Published ({decks.filter(d => d.communityPublishedId).length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tab List */}
          <div className="hidden sm:block">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'favorites' | 'learned' | 'added' | 'created' | 'published')}>
              <TabsList className="bg-white dark:bg-gray-800 shadow-sm inline-flex">
                <TabsTrigger value="all" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  All
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="favorites" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <Star className="w-4 h-4 mr-1" />
                  Favorites
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => d.favorite).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="learned" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Learned
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => d.learned).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="added" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[active]:text-emerald-400 text-sm whitespace-nowrap">
                  <Download className="w-4 h-4 mr-1" />
                  Added
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => d.sourceCommunityDeckId && !d.communityPublishedId).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="created" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <User className="w-4 h-4 mr-1" />
                  Your Decks
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => !d.sourceCommunityDeckId || d.communityPublishedId).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="published" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <Upload className="w-4 h-4 mr-1" />
                  Published
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => d.communityPublishedId).length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-gray-800 text-sm sm:text-base">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Order</SelectItem>
                <SelectItem value="alphabetical-asc">A → Z</SelectItem>
                <SelectItem value="alphabetical-desc">Z → A</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="recently-studied">Recently Studied</SelectItem>
                <SelectItem value="most-studied">Most Studied</SelectItem>
                <SelectItem value="least-studied">Least Studied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Decks Grid */}
        {sortedDecks.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            {searchQuery ? (
              <>
                <Search className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No decks found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Try adjusting your search query or filters
                </p>
              </>
            ) : (
              <>
                <BookOpen className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {activeTab === 'all' ? 'No decks yet' : 
                   activeTab === 'favorites' ? 'No favorite decks yet' : 
                   activeTab === 'learned' ? 'No learned decks yet' :
                   activeTab === 'added' ? 'No added decks yet' :
                   activeTab === 'created' ? 'No created decks yet' :
                   'No published decks yet'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {activeTab === 'all' ? 'Create your first deck to get started!' : 
                   activeTab === 'favorites' ? 'Star decks to mark them as favorites!' : 
                   activeTab === 'learned' ? 'Mark decks as learned when you master them!' :
                   activeTab === 'added' ? 'Import decks from the Community to see them here!' :
                   activeTab === 'created' ? 'Create a new deck to get started!' :
                   'Publish a deck to the community to see it here!'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {paginatedDecks.map((deck) => {
                // DEBUG: Log deck properties for "Bugs" deck
                if (deck.name === 'Bugs') {
                  console.log('=== BUGS DECK RENDER ===')
                  console.log('Deck ID:', deck.id)
                  console.log('communityPublishedId:', deck.communityPublishedId)
                  console.log('sourceCommunityDeckId:', deck.sourceCommunityDeckId)
                  console.log('creatorId:', deck.creatorId)
                  console.log('user.id:', user?.id)
                  console.log('Should show green publish?', !deck.communityPublishedId && deck.creatorId === user?.id && !deck.sourceCommunityDeckId && deck.category && deck.subtopic)
                  console.log('Should show blue update?', deck.communityPublishedId && deck.creatorId === user?.id)
                }
                
                return (
                  <div
                    key={deck.id}
                    draggable={sortOption === 'custom'}
                    onDragStart={() => handleDragStart(deck.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(deck.id)}
                    className={`bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-md hover:shadow-xl transition-all group relative overflow-hidden w-full border border-transparent dark:border-gray-700 ${
                      sortOption === 'custom' ? 'cursor-move' : 'cursor-pointer'
                    }`}
                  >
                    {/* Top action button - drag only when in custom mode */}
                    {sortOption === 'custom' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="w-full">
                      <button
                        onClick={() => handleDeckClick(deck.id)}
                        className="w-full text-left"
                      >
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: deck.color }}
                        >
                          {deck.emoji}
                        </div>
                        <h3 className="mb-2 truncate dark:text-gray-100">{deck.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {deck.cardCount || 0} {deck.cardCount === 1 ? 'card' : 'cards'}
                        </p>
                        
                        {/* Ownership indicator */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {deck.creatorId === user?.id ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              Your Deck
                            </span>
                          ) : deck.sourceCommunityDeckId ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                              From Community
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              Your Deck
                            </span>
                          )}
                          {/* Published badge */}
                          {deck.communityPublishedId && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              <Upload className="w-3 h-3 mr-1" />
                              Published
                            </span>
                          )}
                        </div>
                        
                        {(deck.category || deck.difficulty) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {deck.category && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {deck.category}
                              </span>
                            )}
                            {deck.subtopic && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                {deck.subtopic}
                              </span>
                            )}
                            {deck.difficulty && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                deck.difficulty === 'beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                deck.difficulty === 'intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                deck.difficulty === 'advanced' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                deck.difficulty === 'expert' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400'
                              }`}>
                                {deck.difficulty === 'beginner' ? '🟢' :
                                 deck.difficulty === 'intermediate' ? '🟡' :
                                 deck.difficulty === 'advanced' ? '🟠' :
                                 deck.difficulty === 'expert' ? '🔴' : '🌈'} {deck.difficulty.charAt(0).toUpperCase() + deck.difficulty.slice(1)}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                      
                      {/* Action buttons - favorite, learned, edit, delete, publish, and share */}
                      <div className="flex items-center gap-1 mt-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleToggleFavorite(e, deck.id)}
                          className={`h-7 w-7 transition-colors ${
                            deck.favorite 
                              ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50' 
                              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${deck.favorite ? 'fill-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleToggleLearned(e, deck.id)}
                          className={`h-7 w-7 transition-colors ${
                            deck.learned 
                              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' 
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle className={`w-4 h-4 ${deck.learned ? 'fill-emerald-600' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleOpenEditDialog(e, deck)}
                          className="h-7 w-7 transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <FileEdit className="w-4 h-4" />
                        </Button>
                        <AlertDialog key={`delete-${deck.id}`}>
                          <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Deck?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{deck.name}" and all its cards. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDeck(deck.id)}
                                disabled={deletingDeckId === deck.id}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deletingDeckId === deck.id ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {/* Only show publish button for decks created by user with category and subtopic, and not already published */}
                        {!deck.communityPublishedId && deck.creatorId === user?.id && !deck.sourceCommunityDeckId && deck.category && deck.subtopic && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!canPublishToCommunity(user?.subscriptionTier, user?.isSuperuser, user?.isModerator)) {
                                setUpgradeFeature('community publishing')
                                setUpgradeModalOpen(true)
                              } else {
                                // Open publish dialog
                                setPublishingDeck(deck)
                                setPublishDialogOpen(true)
                              }
                            }}
                            className="h-7 w-7 transition-colors text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Publish to Community"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        )}
                        {/* Show "incomplete" publish button for decks missing category or subtopic */}
                        {!deck.communityPublishedId && deck.creatorId === user?.id && !deck.sourceCommunityDeckId && (!deck.category || !deck.subtopic) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              toast.info(`Add ${!deck.category ? 'a category' : 'a subtopic'} to publish this deck`)
                              handleOpenEditDialog(e, deck)
                            }}
                            className="h-7 w-7 transition-colors text-gray-300 dark:text-gray-600 hover:text-amber-500 hover:bg-amber-50"
                            title={`Add ${!deck.category ? 'category' : 'subtopic'} to publish`}
                          >
                            <Upload className="w-4 h-4 opacity-50" />
                          </Button>
                        )}
                        {/* Show update button for published decks created by user */}
                        {deck.communityPublishedId && deck.creatorId === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!canPublishToCommunity(user?.subscriptionTier, user?.isSuperuser, user?.isModerator)) {
                                setUpgradeFeature('community publishing')
                                setUpgradeModalOpen(true)
                              } else {
                                // Open publish dialog (will update existing)
                                setPublishingDeck(deck)
                                setPublishDialogOpen(true)
                              }
                            }}
                            className="h-7 w-7 transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Update Published Deck"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        )}
                        {/* Show unpublish button for published decks created by user */}
                        {deck.communityPublishedId && deck.creatorId === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleUnpublishDeck(e, deck.id, deck.name, deck.communityPublishedId)}
                            className="h-7 w-7 transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Unpublish from Community"
                          >
                            <Upload className="w-4 h-4 rotate-180" />
                          </Button>
                        )}
                        {/* Show share button for decks created by user */}
                        {deck.creatorId === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSharingDeck(deck)
                              setShareDialogOpen(true)
                            }}
                            className="h-7 w-7 transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Share Deck"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
      )}
      <ShareDeckDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        deckId={sharingDeck?.id || ''}
        deckName={sharingDeck?.name || ''}
        isCommunityDeck={false}
        accessToken={accessToken}
      />

      {/* Publish to Community Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{publishingDeck?.communityPublishedId ? 'Update Published Deck' : 'Publish to Community'}</DialogTitle>
            <DialogDescription>
              {publishingDeck?.communityPublishedId 
                ? 'Push your latest changes to the community version' 
                : 'Share your deck with the Flashy community'}
            </DialogDescription>
          </DialogHeader>
          {publishingDeck && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: publishingDeck.color }}
                  >
                    {publishingDeck.emoji}
                  </div>
                  <div>
                    <h3 className="font-medium dark:text-gray-100">{publishingDeck.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {publishingDeck.cardCount || 0} {publishingDeck.cardCount === 1 ? 'card' : 'cards'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {publishingDeck.category}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {publishingDeck.subtopic}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {publishingDeck.communityPublishedId
                  ? 'This will update the community version with your latest changes. All users who added this deck will see the updates.'
                  : 'Your deck will be visible to all community members. Are you ready to share your knowledge?'}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
              disabled={publishing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublishToCommunity}
              disabled={publishing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {publishing ? (publishingDeck?.communityPublishedId ? 'Updating...' : 'Publishing...') : (publishingDeck?.communityPublishedId ? 'Update' : 'Publish')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unpublish from Community Dialog */}
      <Dialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unpublish from Community</DialogTitle>
            <DialogDescription>
              Remove your deck from the Flashy community
            </DialogDescription>
          </DialogHeader>
          {unpublishingDeck && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: unpublishingDeck.color }}
                  >
                    {unpublishingDeck.emoji}
                  </div>
                  <div>
                    <h3 className="font-medium dark:text-gray-100">{unpublishingDeck.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {unpublishingDeck.cardCount || 0} {unpublishingDeck.cardCount === 1 ? 'card' : 'cards'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {unpublishingDeck.category}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {unpublishingDeck.subtopic}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will remove your deck from the community, but you can republish it later. Are you sure?
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setUnpublishDialogOpen(false)}
              disabled={unpublishingDeckId !== null}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUnpublish}
              disabled={unpublishingDeckId !== null}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {unpublishingDeckId !== null ? 'Unpublishing...' : 'Unpublish'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
      />
    </AppLayout>
  )
}