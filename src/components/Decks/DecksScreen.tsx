import { useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { fetchDecks, createDeck, updateDeck, updateDeckPositions, deleteDeck, fetchCards } from '../../../utils/api/decks'
import { publishDeck, unpublishDeck, updateCommunityDeck } from '../../../utils/api/community'
import { fetchStudySessions } from '../../../utils/api/study'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { Pagination } from '../Pagination/Pagination'
import { Input } from '../../ui/input'
import { Plus, BookOpen, GripVertical, Trash2, Star, CheckCircle, ArrowUpDown, Search, X, Filter, FileEdit, Crown, Download, User, Share2, Upload } from 'lucide-react'
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
import { canCreateDeck, canPublishToCommunity } from '../../../utils/subscription'
import { useIsSuperuser } from '../../../utils/userUtils'

export function DecksScreen() {
  const { user, accessToken, decks, setDecks, addDeck, updateDeck: updateDeckInStore, setSelectedDeckId, userAchievements, studySessions, setStudySessions, shouldReloadDecks, fetchUserAchievements } = useStore()
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
    loadStudySessions()
    // ✅ Fetch achievements from backend if not already loaded
    if (accessToken && !userAchievements) {
      fetchUserAchievements()
    }
  }, [])

  const loadDecks = async () => {
    if (!accessToken || !user) {
      setLoading(false)
      return
    }
    
    if (!shouldReloadDecks()) {
      console.log('📦 Using cached decks, skipping reload')
      setLoading(false)
      return
    }
    
    console.log('🔄 Cache stale or invalidated, reloading decks...')
    try {
      const fetchedDecks = await fetchDecks(accessToken)
      console.log('FETCHED DECKS:', fetchedDecks)
      setDecks(fetchedDecks)
    } catch (error) {
      console.error('Failed to load decks:', error)
      if (accessToken && user) {
        toast.error('Failed to load decks. Please try refreshing the page.')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadStudySessions = async () => {
    if (!accessToken) return
    
    try {
      const sessions = await fetchStudySessions(accessToken)
      setStudySessions(sessions)
      console.log('Loaded study sessions:', sessions.length)
    } catch (error) {
      console.error('Failed to load study sessions:', error)
    }
  }

  const handleCreateDeckClick = () => {
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

    const deck = await createDeck(accessToken, data)
    addDeck(deck)
    
    // ✅ No need to manually update achievements - backend tracks this
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

    const newDecks = [...decks]
    const [removed] = newDecks.splice(draggedIndex, 1)
    newDecks.splice(targetIndex, 0, removed)

    const updatedDecks = newDecks.map((deck, index) => ({
      ...deck,
      position: index,
    }))

    setDecks(updatedDecks)
    setDraggedDeck(null)

    try {
      await updateDeckPositions(accessToken, updatedDecks.map(d => ({ id: d.id, position: d.position })))
    } catch (error) {
      console.error('Failed to update deck positions:', error)
    }
  }

  const handleDeckClick = (deckId: string) => {
    setSelectedDeckId(deckId)
    navigate(`/deck-detail/${deckId}`)
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (!accessToken) return

    setDeletingDeckId(deckId)
    try {
      const result = await deleteDeck(accessToken, deckId)
      updateDeckInStore(deckId, { 
        isDeleted: true, 
        deletedAt: new Date().toISOString() 
      })
      
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

    const newFavoriteStatus = !deck.isFavorite
    console.log('NEW FAVORITE STATUS', newFavoriteStatus)

    updateDeckInStore(deckId, { isFavorite: newFavoriteStatus })

    try {
      await updateDeck(accessToken, deckId, { isFavorite: newFavoriteStatus })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      updateDeckInStore(deckId, { isFavorite: !newFavoriteStatus })
      toast.error('Failed to update favorite status')
    }
  }

  const handleToggleLearned = async (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation()
    if (!accessToken) return

    const deck = decks.find(d => d.id === deckId)
    if (!deck) return

    const newLearnedStatus = !deck.isLearned

    updateDeckInStore(deckId, { isLearned: newLearnedStatus })

    try {
      await updateDeck(accessToken, deckId, { isLearned: newLearnedStatus })
    } catch (error) {
      console.error('Failed to toggle learned:', error)
      updateDeckInStore(deckId, { isLearned: !newLearnedStatus })
      toast.error('Failed to update learned status')
    }
  }

  const handlePublishToCommunity = async () => {
    if (!accessToken || !publishingDeck) return

    console.log('=== PUBLISH/UPDATE ATTEMPT ===')
    console.log('Deck ID:', publishingDeck.id)
    console.log('Deck name:', publishingDeck.name)
    console.log('Category:', publishingDeck.category)
    console.log('Subtopic:', publishingDeck.subtopic)

    if (!publishingDeck.cardCount || publishingDeck.cardCount === 0) {
      toast.error('Cannot publish an empty deck')
      setPublishDialogOpen(false)
      return
    }

    if (publishingDeck.isShared) {
      toast.error('Cannot publish a shared deck to the community')
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
      console.log('📤 Calling publishDeck with:', {
        deckId: publishingDeck.id,
        publishData: {
          category: publishingDeck.category,
          subtopic: publishingDeck.subtopic,
        }
      })

      const result = await publishDeck(
        accessToken,
        publishingDeck.id,
        {
          category: publishingDeck.category,
          subtopic: publishingDeck.subtopic,
        }
      )

      console.log('✅ Publish result:', result)
      console.log('✅ Published deck ID:', result.deck?.id)
      console.log('✅ Published deck version:', result.deck?.version)

      updateDeckInStore(publishingDeck.id, {
        communityPublishedId: result.deck?.id,
        communityDeckVersion: result.deck?.version,
      })

      console.log('✅ Updated deck in store with communityPublishedId:', result.deck?.id)

      setTimeout(async () => {
        try {
          const freshDecks = await fetchDecks(accessToken)
          console.log('🔄 Reloaded decks after publish:', 
            freshDecks.filter(d => d.communityPublishedId).map(d => ({
              name: d.name,
              communityPublishedId: d.communityPublishedId
            }))
          )
          setDecks(freshDecks)
          console.log('FRESH DECKS', freshDecks)
        } catch (error) {
          console.error('Failed to reload decks:', error)
        }
      }, 500)

      if (result.updated || result.republished) {
        toast.success('Published deck updated successfully!')
      } else {
        toast.success('Deck published to community successfully!')
      }
      setPublishDialogOpen(false)
      setPublishingDeck(null)
    } catch (error: any) {
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

  const handleUnpublishDeck = async (e: React.MouseEvent, deckId: string, deckName: string, communityPublishedId: string) => {
    e.stopPropagation()
    if (!accessToken) {
      toast.error('Please log in to unpublish decks')
      return
    }

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
      await unpublishDeck(accessToken, unpublishingDeck.communityPublishedId)
      
      updateDeckInStore(unpublishingDeck.id, {
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

    await updateDeck(accessToken, editingDeck.id, data)

    updateDeckInStore(editingDeck.id, data)

    if (editingDeck.communityPublishedId && !editingDeck.sourceCommunityDeckId) {
      try {
        const deckCards = await fetchCards(accessToken, editingDeck.id)
        await updateCommunityDeck(accessToken, editingDeck.communityPublishedId, {
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

  const filteredDecks = decks.filter(deck => {
    if (deck.isDeleted) return false

    if (deck.isPublished) {
      console.log(`🔍 Deck "${deck.name}" has isPublished:`, deck.isPublished)
    }
    
    const tabFilter = (() => {
      if (activeTab === 'favorites') return !!deck.isFavorite
      if (activeTab === 'learned') return !!deck.isLearned
      if (activeTab === 'added') {
        return deck.isCommunity || deck.isShared
      }
      if (activeTab === 'created') {
        return (!deck.isCommunity) && !deck.isShared
      }
      if (activeTab === 'published') {
        const isPublished = !!deck.isPublished
        console.log(`🔍 Checking deck "${deck.name}" for published tab: ${isPublished}`)
        return isPublished
      }
      return true
    })()
    
    const searchFilter = searchQuery.trim() === '' || 
      deck.name.toLowerCase().includes(searchQuery.toLowerCase())

    const categoryFilter = filterCategory === 'all' || deck.category === filterCategory

    const subtopicFilter = filterSubtopic === 'all' || deck.subtopic === filterSubtopic
    
    const result = tabFilter && searchFilter && categoryFilter && subtopicFilter
    
    if (activeTab === 'published' && deck.isPublished) {
      console.log(`🔍 Deck "${deck.name}\" published filter result:`, {
        tabFilter,
        searchFilter,
        categoryFilter,
        subtopicFilter,
        finalResult: result
      })
    }
    
    return result
  })

  const getDeckStudyStats = (deckId: string) => {
    const deckSessions = studySessions.filter(s => s.deckId === deckId)
    const studyCount = deckSessions.length
    const lastStudyDate = deckSessions.length > 0 
      ? Math.max(...deckSessions.map(s => new Date(s.date).getTime()))
      : 0
    return { studyCount, lastStudyDate }
  }

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

  const totalPages = Math.ceil(sortedDecks.length / ITEMS_PER_PAGE)
  const paginatedDecks = sortedDecks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const publishedCount = decks.filter(d => !!d.isPublished).length
  console.log('🔍 Published decks count:', publishedCount)
  return (
    <AppLayout>
      {loading ? (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">Loading My Flashcards...</div>
        </div>
      ) : (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-3 pt-5 pb-3 sm:px-6 sm:pt-6 lg:p-8 overflow-x-hidden">
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

        <EditDeckDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          deck={editingDeck}
          onUpdateDeck={handleUpdateDeck}
        />

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

        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'favorites' | 'learned' | 'added' | 'created' | 'published')}>
              <SelectTrigger className="bg-white dark:bg-gray-800 text-sm w-full">
                <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({decks.length})</SelectItem>
                <SelectItem value="favorites">Favorites ({decks.filter(d => d.isFavorite).length})</SelectItem>
                <SelectItem value="learned">Learned ({decks.filter(d => d.isLearned).length})</SelectItem>
                <SelectItem value="added">Added ({decks.filter(d => (d.sourceCommunityDeckId && !d.communityPublishedId) || d.isShared).length})</SelectItem>
                <SelectItem value="created">Your Decks ({decks.filter(d => (!d.sourceCommunityDeckId || d.communityPublishedId) && !d.isShared).length})</SelectItem>
                <SelectItem value="published">Published ({publishedCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                    {decks.filter(d => d.isFavorite).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="learned" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Learned
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => d.isLearned).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="added" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[active]:text-emerald-400 text-sm whitespace-nowrap">
                  <Download className="w-4 h-4 mr-1" />
                  Added
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => (d.sourceCommunityDeckId && !d.communityPublishedId) || d.isShared).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="created" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <User className="w-4 h-4 mr-1" />
                  Your Decks
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => (!d.sourceCommunityDeckId || d.communityPublishedId) && !d.isShared).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="published" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <Upload className="w-4 h-4 mr-1" />
                  Published
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {publishedCount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

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

        {sortedDecks.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            {searchQuery || filterCategory !== 'all' || filterSubtopic !== 'all' ? (
              <>
                <Search className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No decks found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Try adjusting your search query or filters
                </p>
                {(filterCategory !== 'all' || filterSubtopic !== 'all') && (
                  <Button
                    onClick={() => {
                      setFilterCategory('all')
                      setFilterSubtopic('all')
                    }}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Clear Filters
                  </Button>
                )}
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
              {paginatedDecks.map((deck) => (
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
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {deck.sourceCommunityDeckId ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                            From Community
                          </span>
                        ) : deck.isShared ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                            Shared
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            Your Deck
                          </span>
                        )}
                        {deck.isPublished && (
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
                    
                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleToggleFavorite(e, deck.id)}
                        className={`h-7 w-7 transition-colors ${
                          deck.isFavorite 
                            ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50' 
                            : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${deck.isFavorite ? 'fill-yellow-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleToggleLearned(e, deck.id)}
                        className={`h-7 w-7 transition-colors ${
                          deck.isLearned 
                            ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' 
                            : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle className={`w-4 h-4 ${deck.isLearned ? 'fill-emerald-600' : ''}`} />
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
                      {!deck.isPublished && deck.userId === user?.id && !deck.sourceCommunityDeckId && deck.category && deck.subtopic && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!canPublishToCommunity(user?.subscriptionTier, user?.isSuperuser, user?.isModerator)) {
                              setUpgradeFeature('community publishing')
                              setUpgradeModalOpen(true)
                            } else {
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
                      {!deck.isPublished && deck.userId === user?.id && !deck.sourceCommunityDeckId && (!deck.category || !deck.subtopic) && (
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
                      {deck.isPublished && deck.userId === user?.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!canPublishToCommunity(user?.subscriptionTier, user?.isSuperuser, user?.isModerator)) {
                                setUpgradeFeature('community publishing')
                                setUpgradeModalOpen(true)
                              } else {
                                setPublishingDeck(deck)
                                setPublishDialogOpen(true)
                              }
                            }}
                            className="h-7 w-7 transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Update Published Deck"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleUnpublishDeck(e, deck.id, deck.name, deck.communityPublishedId)}
                            className="h-7 w-7 transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Unpublish from Community"
                          >
                            <Upload className="w-4 h-4 rotate-180" />
                          </Button>
                        </>
                      )}
                      {deck.userId === user?.id && (
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
              ))}
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