import { useEffect, useState } from 'react'
import { useStore, Deck } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import * as api from '../../../utils/api'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { Pagination } from '../Pagination/Pagination'
import { projectId } from '../../../utils/supabase/info'
import { Plus, BookOpen, GripVertical, Trash2, Star, CheckCircle, ArrowUpDown, Search, X, Filter, FileEdit, Crown, Download, User, Share2, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { toast } from 'sonner'
import { DECK_CATEGORIES } from '../../../utils/categories'
import { ShareDeckDialog } from '../ShareDeckDialog'

type SortOption = 'alphabetical-asc' | 'alphabetical-desc' | 'newest' | 'oldest' | 'recently-studied' | 'most-studied' | 'least-studied'

import { UpgradeModal } from '../UpgradeModal'
import { canCreateDeck, canPublishToCommunity } from '../../../utils/subscription'
import { ColorPicker } from '../ColorPicker'
import { EmojiPicker } from '../EmojiPicker'
import { useIsSuperuser } from '../../../utils/userUtils'

export function DecksScreen() {
  const { user, accessToken, decks, setDecks, addDeck, updateDeck, removeDeck, setSelectedDeckId, userAchievements, setUserAchievements, studySessions } = useStore()
  const { navigateTo, navigate } = useNavigation()
  const isSuperuser = useIsSuperuser()
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>()
  const [newDeckName, setNewDeckName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📚')
  const [selectedColor, setSelectedColor] = useState('#10B981')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubtopic, setSelectedSubtopic] = useState('')
  const [creating, setCreating] = useState(false)
  const [draggedDeck, setDraggedDeck] = useState<string | null>(null)
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'learned' | 'added' | 'created'>('all')
  const [sortOption, setSortOption] = useState<SortOption>('alphabetical-asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterSubtopic, setFilterSubtopic] = useState<string>('all')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<any>(null)
  const [editDeckName, setEditDeckName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSubtopic, setEditSubtopic] = useState('')
  const [updating, setUpdating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharingDeck, setSharingDeck] = useState<any>(null)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishingDeck, setPublishingDeck] = useState<any>(null)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    loadDecks()
    loadAchievements()
  }, [])

  const loadDecks = async () => {
    if (!accessToken || !user) {
      setLoading(false)
      return
    }
    
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

  const handleCreateDeckClick = () => {
    // Check if user can create more decks
    if (!canCreateDeck(decks.length, user?.subscriptionTier, isSuperuser)) {
      setUpgradeFeature('unlimited decks')
      setUpgradeModalOpen(true)
      return
    }
    setCreateDialogOpen(true)
  }

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !newDeckName.trim()) return

    // Double-check limit
    if (!canCreateDeck(decks.length, user?.subscriptionTier)) {
      setCreateDialogOpen(false)
      setUpgradeFeature('unlimited decks')
      setUpgradeModalOpen(true)
      return
    }

    setCreating(true)
    try {
      const deck = await api.createDeck(accessToken, {
        name: newDeckName,
        emoji: selectedEmoji,
        color: selectedColor,
        category: selectedCategory || undefined,
        subtopic: selectedSubtopic || undefined,
      })
      
      addDeck(deck)
      
      // Track deck customization achievement
      if ((selectedEmoji !== '📚' || selectedColor !== '#10B981') && userAchievements) {
        setUserAchievements({
          ...userAchievements,
          customizedDeckTheme: true,
        })
      }
      
      setCreateDialogOpen(false)
      setNewDeckName('')
      setSelectedEmoji('📚')
      setSelectedColor('#10B981')
      setSelectedCategory('')
      setSelectedSubtopic('')
    } catch (error) {
      console.error('Failed to create deck:', error)
    } finally {
      setCreating(false)
    }
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

  const handleOpenEditDialog = (e: React.MouseEvent, deck: Deck) => {
    e.stopPropagation()
    setEditingDeck(deck)
    setEditDeckName(deck.name)
    setEditEmoji(deck.emoji)
    setEditColor(deck.color)
    setEditCategory(deck.category || '')
    setEditSubtopic(deck.subtopic || '')
    setEditDialogOpen(true)
  }

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !editingDeck || !editDeckName.trim()) return

    setUpdating(true)
    try {
      // Update the local deck
      await api.updateDeck(accessToken, editingDeck.id, {
        name: editDeckName,
        emoji: editEmoji,
        color: editColor,
        category: editCategory || undefined,
        subtopic: editSubtopic || undefined,
      })

      updateDeck(editingDeck.id, {
        name: editDeckName,
        emoji: editEmoji,
        color: editColor,
        category: editCategory || undefined,
        subtopic: editSubtopic || undefined,
      })

      // If this is a deck the user created and published to community, also update the community version
      if (editingDeck.communityPublishedId && !editingDeck.sourceCommunityDeckId) {
        try {
          const deckCards = await api.fetchCards(accessToken, editingDeck.id)
          await api.updateCommunityDeck(accessToken, editingDeck.communityPublishedId, {
            name: editDeckName,
            emoji: editEmoji,
            color: editColor,
            category: editCategory || undefined,
            subtopic: editSubtopic || undefined,
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

      setEditDialogOpen(false)
      setEditingDeck(null)
    } catch (error) {
      console.error('Failed to update deck:', error)
      toast.error('Failed to update deck')
    } finally {
      setUpdating(false)
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

      // Update local deck with community reference
      updateDeck(publishingDeck.id, {
        communityPublishedId: result.publishedDeck?.id,
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
      toast.error(error.message || 'Failed to publish deck to community')
    } finally {
      setPublishing(false)
    }
  }

  // Filter decks based on active tab, search query, and category/subtopic
  const filteredDecks = decks.filter(deck => {
    // First filter by tab
    const tabFilter = (() => {
      if (activeTab === 'favorites') return deck.favorite
      if (activeTab === 'learned') return deck.learned
      if (activeTab === 'added') return !!deck.sourceCommunityDeckId // Imported from community
      if (activeTab === 'created') return !deck.sourceCommunityDeckId // Created by user
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-emerald-600 dark:text-emerald-400">Loading...</div>
      </div>
    )
  }

  return (
    <AppLayout>
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

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
              <DialogDescription>
                Choose a name, emoji, and color for your new flashcard deck.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDeck} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="deckName">Deck Name</Label>
                <Input
                  id="deckName"
                  placeholder="e.g., Spanish Vocabulary"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <EmojiPicker 
                emoji={selectedEmoji} 
                onChange={setSelectedEmoji}
              />

              <ColorPicker 
                color={selectedColor} 
                onChange={setSelectedColor}
              />

              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Select value={selectedCategory} onValueChange={(value) => {
                  setSelectedCategory(value)
                  setSelectedSubtopic('')
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DECK_CATEGORIES.map(cat => (
                      <SelectItem key={cat.category} value={cat.category}>
                        {cat.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && (
                <div>
                  <Label htmlFor="subtopic">Subtopic (Optional)</Label>
                  <Select value={selectedSubtopic} onValueChange={setSelectedSubtopic}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a subtopic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DECK_CATEGORIES.find(c => c.category === selectedCategory)?.subtopics.map(subtopic => (
                        <SelectItem key={subtopic} value={subtopic}>
                          {subtopic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Deck'}
              </Button>
            </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Deck Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Deck</DialogTitle>
              <DialogDescription>
                Update your deck's name, emoji, color, and category.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateDeck} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="editDeckName">Deck Name</Label>
                <Input
                  id="editDeckName"
                  placeholder="e.g., Spanish Vocabulary"
                  value={editDeckName}
                  onChange={(e) => setEditDeckName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <EmojiPicker 
                emoji={editEmoji} 
                onChange={setEditEmoji}
              />

              <ColorPicker 
                color={editColor} 
                onChange={setEditColor}
              />

              <div>
                <Label htmlFor="editCategory">Category (Optional)</Label>
                <Select value={editCategory || 'none'} onValueChange={(value) => {
                  setEditCategory(value === 'none' ? '' : value)
                  setEditSubtopic('')
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {DECK_CATEGORIES.map(cat => (
                      <SelectItem key={cat.category} value={cat.category}>
                        {cat.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editCategory && (
                <div>
                  <Label htmlFor="editSubtopic">Subtopic (Optional)</Label>
                  <Select value={editSubtopic || 'none'} onValueChange={(value) => setEditSubtopic(value === 'none' ? '' : value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a subtopic..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {DECK_CATEGORIES.find(c => c.category === editCategory)?.subtopics.map(subtopic => (
                        <SelectItem key={subtopic} value={subtopic}>
                          {subtopic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Deck'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

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
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'favorites' | 'learned' | 'added' | 'created')}>
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
                  Added ({decks.filter(d => d.sourceCommunityDeckId).length})
                </SelectItem>
                <SelectItem value="created">
                  Your Decks ({decks.filter(d => !d.sourceCommunityDeckId).length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tab List */}
          <div className="hidden sm:block">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'favorites' | 'learned' | 'added' | 'created')}>
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
                    {decks.filter(d => d.sourceCommunityDeckId).length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="created" className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-sm whitespace-nowrap">
                  <User className="w-4 h-4 mr-1" />
                  Your Decks
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {decks.filter(d => !d.sourceCommunityDeckId).length}
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
                   'No created decks yet'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {activeTab === 'all' ? 'Create your first deck to get started!' : 
                   activeTab === 'favorites' ? 'Star decks to mark them as favorites!' : 
                   activeTab === 'learned' ? 'Mark decks as learned when you master them!' :
                   activeTab === 'added' ? 'Import decks from the Community to see them here!' :
                   'Create a new deck to get started!'}
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
                draggable
                onDragStart={() => handleDragStart(deck.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(deck.id)}
                className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-md hover:shadow-xl transition-all group cursor-move relative overflow-hidden w-full border border-transparent dark:border-gray-700"
              >
                {/* Top action button - drag only */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                </div>
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
                    <div className="mt-2">
                      {deck.sourceCommunityDeckId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          From Community
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          Your Deck
                        </span>
                      )}
                    </div>
                    
                    {deck.category && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {deck.category}
                        </span>
                        {deck.subtopic && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            {deck.subtopic}
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
                    <AlertDialog>
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
                    {/* Only show publish button for decks created by user (not imported) with category and subtopic */}
                    {!deck.sourceCommunityDeckId && deck.category && deck.subtopic && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!canPublishToCommunity(user?.subscriptionTier)) {
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
                    {!deck.sourceCommunityDeckId && (
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
            <DialogTitle>Publish to Community</DialogTitle>
            <DialogDescription>
              Share your deck with the Flashy community
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
                Your deck will be visible to all community members. Are you ready to share your knowledge?
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
              {publishing ? 'Publishing...' : 'Publish'}
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