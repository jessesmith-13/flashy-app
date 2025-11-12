import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { ArrowLeft, Play, Clock, Shuffle, ArrowRight, Star, EyeOff } from 'lucide-react'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'

export function StudyOptionsScreen() {
  const { decks, selectedDeckId, cards, setCurrentView, setStudyOptions, setStudyAllCards } = useStore()
  const deck = decks.find((d) => d.id === selectedDeckId)
  const deckCards = cards.filter((c) => c.deckId === selectedDeckId)

  const [timedMode, setTimedMode] = useState(false)
  const [continuousShuffle, setContinuousShuffle] = useState(false)
  const [order, setOrder] = useState<'randomized' | 'linear'>('randomized')
  const [excludeIgnored, setExcludeIgnored] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const ignoredCount = deckCards.filter(c => c.ignored).length
  const favoritesCount = deckCards.filter(c => c.favorite).length

  const handleStartStudy = () => {
    setStudyOptions({
      timedMode,
      continuousShuffle,
      order,
      excludeIgnored,
      favoritesOnly,
    })
    setStudyAllCards(false) // Ensure we're studying a specific deck
    setCurrentView('study')
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

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setCurrentView('deck-detail')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Deck
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md">
            {/* Deck Header */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: deck.color }}
              >
                {deck.emoji}
              </div>
              <div>
                <h1 className="text-2xl mb-1 text-gray-900 dark:text-gray-100">{deck.name}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure study session</p>
              </div>
            </div>

            {/* Study Options */}
            <div className="space-y-6">
              {/* Card Order */}
              <div>
                <Label className="text-base mb-3 block">Card Order</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrder('randomized')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      order === 'randomized'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                    }`}
                  >
                    <Shuffle className={`w-5 h-5 mb-2 ${order === 'randomized' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    <div className="text-sm text-gray-900 dark:text-gray-100">Randomized</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Shuffle cards</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrder('linear')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      order === 'linear'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                    }`}
                  >
                    <ArrowRight className={`w-5 h-5 mb-2 ${order === 'linear' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    <div className="text-sm text-gray-900 dark:text-gray-100">Linear</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">In order</div>
                  </button>
                </div>
              </div>

              {/* Timed Mode */}
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <Label htmlFor="timed-mode" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100">Timed Mode</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Add a timer for each card</p>
                  </div>
                </div>
                <Switch
                  id="timed-mode"
                  checked={timedMode}
                  onCheckedChange={setTimedMode}
                />
              </div>

              {/* Continuous Shuffle */}
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <Shuffle className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <Label htmlFor="continuous-shuffle" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100">Continuous Shuffle</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Keep studying without end</p>
                  </div>
                </div>
                <Switch
                  id="continuous-shuffle"
                  checked={continuousShuffle}
                  onCheckedChange={setContinuousShuffle}
                />
              </div>

              {/* Exclude Ignored Cards */}
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <Label htmlFor="exclude-ignored" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100">Exclude Ignored Cards</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Skip cards marked as ignored {ignoredCount > 0 && `(${ignoredCount})`}
                    </p>
                  </div>
                </div>
                <Switch
                  id="exclude-ignored"
                  checked={excludeIgnored}
                  onCheckedChange={setExcludeIgnored}
                  disabled={favoritesOnly}
                />
              </div>

              {/* Favorites Only */}
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <Label htmlFor="favorites-only" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100">Favorites Only</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Only study favorite cards {favoritesCount > 0 && `(${favoritesCount})`}
                    </p>
                  </div>
                </div>
                <Switch
                  id="favorites-only"
                  checked={favoritesOnly}
                  onCheckedChange={setFavoritesOnly}
                  disabled={excludeIgnored}
                />
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartStudy}
              className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white h-12"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Studying
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
