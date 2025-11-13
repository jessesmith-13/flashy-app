import { Button } from '../../../ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../ui/alert-dialog'
import { GripVertical, Edit, Star, EyeOff, Trash2, FlipVertical, CheckCircle, Keyboard } from 'lucide-react'
import type { Card, CardType } from '../../../../store/useStore'

const CARD_TYPES: { value: CardType; label: string; icon: typeof FlipVertical }[] = [
  { value: 'classic-flip', label: 'Classic Flip', icon: FlipVertical },
  { value: 'multiple-choice', label: 'Multiple Choice', icon: CheckCircle },
  { value: 'type-answer', label: 'Type to Answer', icon: Keyboard },
]

interface CardItemProps {
  card: Card
  onEdit: (cardId: string) => void
  onDelete: (cardId: string) => void
  onToggleFavorite: (cardId: string) => void
  onToggleIgnored: (cardId: string) => void
  onDragStart: (cardId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (cardId: string) => void
}

export function CardItem({
  card,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleIgnored,
  onDragStart,
  onDragOver,
  onDrop
}: CardItemProps) {
  const cardTypeInfo = CARD_TYPES.find(t => t.value === card.cardType)
  const TypeIcon = cardTypeInfo?.icon || FlipVertical

  return (
    <div
      draggable
      onDragStart={() => onDragStart(card.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(card.id)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow cursor-move relative group"
    >
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2 sm:space-y-3 pr-12 sm:pr-16">
          <div className="flex items-center gap-2 mb-2">
            <TypeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{cardTypeInfo?.label}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1 uppercase tracking-wide">
              {card.cardType === 'classic-flip' ? 'Front' : 'Question'}
            </p>
            {card.front && <p className="text-sm break-words text-gray-900 dark:text-gray-100">{card.front}</p>}
            {card.frontImageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border">
                <img 
                  src={card.frontImageUrl} 
                  alt="Question image" 
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1 uppercase tracking-wide">
              {card.cardType === 'classic-flip' ? 'Back' : card.cardType === 'multiple-choice' && card.correctAnswers && card.correctAnswers.length > 1 ? 'Correct Answers' : 'Answer'}
            </p>
            {card.cardType === 'multiple-choice' && card.correctAnswers && card.correctAnswers.length > 0 ? (
              <ul className="text-sm space-y-1">
                {card.correctAnswers.map((answer, idx) => (
                  <li key={idx} className="text-gray-900 dark:text-gray-100 break-words flex items-start gap-1">
                    <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0">✓</span>
                    <span>{answer}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                {card.back && <p className="text-sm break-words text-gray-900 dark:text-gray-100">{card.back}</p>}
                {card.cardType === 'classic-flip' && card.backImageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border">
                    <img 
                      src={card.backImageUrl} 
                      alt="Answer image" 
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </>
            )}
          </div>
          {card.cardType === 'multiple-choice' && card.options && card.options.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-1 uppercase tracking-wide">Incorrect Options</p>
              <ul className="text-sm space-y-1">
                {card.options.map((option, idx) => (
                  <li key={idx} className="text-gray-600 dark:text-gray-400 break-words">• {option}</li>
                ))}
              </ul>
            </div>
          )}
          {card.cardType === 'type-answer' && card.acceptedAnswers && card.acceptedAnswers.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-1 uppercase tracking-wide">Accepted Alternatives</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 break-words">{card.acceptedAnswers.join(', ')}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5 sm:gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(card.id)}
            className={`h-7 w-7 sm:h-8 sm:w-8 ${card.favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
            title={card.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.favorite ? 'fill-yellow-500' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleIgnored(card.id)}
            className={`h-7 w-7 sm:h-8 sm:w-8 ${card.ignored ? 'text-gray-600 hover:text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
            title={card.ignored ? 'Unignore card' : 'Ignore card'}
          >
            <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(card.id)}
            className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 hover:text-blue-700"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Card?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this card. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(card.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
