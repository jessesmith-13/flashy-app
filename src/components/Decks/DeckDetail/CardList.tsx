import { useState, useEffect } from 'react'
import { CardItem } from './CardItem'
import { Pagination } from '../../Pagination/Pagination'
import { Eye, Star, EyeOff, ArrowUpDown } from 'lucide-react'
import type { Card } from '../../../../store/useStore'

interface CardListProps {
  cards: Card[]
  onEditCard: (cardId: string) => void
  onDeleteCard: (cardId: string) => void
  onToggleFavorite: (cardId: string) => void
  onToggleIgnored: (cardId: string) => void
  onCardDragStart: (cardId: string) => void
  onCardDragOver: (e: React.DragEvent) => void
  onCardDrop: (cardId: string) => void
}

const ITEMS_PER_PAGE = 20

export function CardList({
  cards,
  onEditCard,
  onDeleteCard,
  onToggleFavorite,
  onToggleIgnored,
  onCardDragStart,
  onCardDragOver,
  onCardDrop
}: CardListProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'favorites' | 'ignored'>('all')
  const [sortBy, setSortBy] = useState<'position' | 'favorites' | 'ignored'>('position')
  const [currentPage, setCurrentPage] = useState(1)

  const getSortedAndFilteredCards = () => {
    let filtered = [...cards]
    
    if (filterTab === 'favorites') {
      filtered = filtered.filter(card => card.favorite)
    } else if (filterTab === 'ignored') {
      filtered = filtered.filter(card => card.ignored)
    }
    
    // Then sort
    if (sortBy === 'favorites') {
      filtered.sort((a, b) => {
        if (a.favorite && !b.favorite) return -1
        if (!a.favorite && b.favorite) return 1
        return (a.position || 0) - (b.position || 0)
      })
    } else if (sortBy === 'ignored') {
      filtered.sort((a, b) => {
        if (a.ignored && !b.ignored) return -1
        if (!a.ignored && b.ignored) return 1
        return (a.position || 0) - (b.position || 0)
      })
    } else {
      filtered.sort((a, b) => (a.position || 0) - (b.position || 0))
    }
    
    return filtered
  }

  const filteredAndSortedCards = getSortedAndFilteredCards()
  const totalPages = Math.ceil(filteredAndSortedCards.length / ITEMS_PER_PAGE)
  const paginatedCards = filteredAndSortedCards.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when filters or sorting changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterTab, sortBy])

  if (cards.length === 0) {
    return (
      <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-gray-600 dark:text-gray-400 mb-2">No cards yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">Add your first card to start studying!</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-2 sm:px-4 py-2 rounded-md transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
              filterTab === 'all'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">All </span>({cards.length})
          </button>
          <button
            onClick={() => setFilterTab('favorites')}
            className={`px-2 sm:px-4 py-2 rounded-md transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
              filterTab === 'favorites'
                ? 'bg-yellow-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Star className={`w-4 h-4 ${filterTab === 'favorites' ? 'fill-white' : ''}`} />
            <span className="hidden sm:inline">Favorites </span>({cards.filter(c => c.favorite).length})
          </button>
          <button
            onClick={() => setFilterTab('ignored')}
            className={`px-2 sm:px-4 py-2 rounded-md transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
              filterTab === 'ignored'
                ? 'bg-gray-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <EyeOff className="w-4 h-4" />
            <span className="hidden sm:inline">Ignored </span>({cards.filter(c => c.ignored).length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'position' | 'favorites' | 'ignored')}
            className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="position">Default Order</option>
            <option value="favorites">Favorites First</option>
            <option value="ignored">Ignored First</option>
          </select>
        </div>
      </div>

      {/* Empty state for filtered views */}
      {filteredAndSortedCards.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">
            {filterTab === 'favorites' ? '⭐' : '👁️'}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {filterTab === 'favorites' ? 'No favorite cards yet' : 'No ignored cards'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {filterTab === 'favorites' 
              ? 'Mark cards as favorites to see them here!' 
              : 'Ignored cards will appear here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedCards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onToggleFavorite={onToggleFavorite}
                onToggleIgnored={onToggleIgnored}
                onDragStart={onCardDragStart}
                onDragOver={onCardDragOver}
                onDrop={onCardDrop}
              />
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
  )
}
