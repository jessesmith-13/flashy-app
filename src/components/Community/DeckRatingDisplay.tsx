import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { getDeckRatings } from '../../../utils/api/community'

interface DeckRatingDisplayProps {
  deckId: string
  className?: string
}

export function DeckRatingDisplay({ deckId, className = '' }: DeckRatingDisplayProps) {
  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRating()
  }, [deckId])

  const loadRating = async () => {
    try {
      const data = await getDeckRatings(deckId)
      setAverageRating(data.averageRating)
      setTotalRatings(data.totalRatings)
    } catch (error) {
      console.error('Failed to load rating:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Star className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Star className={`w-4 h-4 ${averageRating > 0 ? 'fill-amber-500 text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {averageRating > 0 ? averageRating.toFixed(1) : '—'}
      </span>
      {totalRatings > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({totalRatings})
        </span>
      )}
    </div>
  )
}
