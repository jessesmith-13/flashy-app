import type { UIDeck, SortOption } from "@/types/decks";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import {
  CheckCircle,
  FileEdit,
  GripVertical,
  Share2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

interface DeckCardProps {
  deck: UIDeck;
  sortOption: SortOption;
  userId?: string;

  favoritePending?: boolean;
  learnedPending?: boolean;

  onDeckClick: (deckId: string) => void;
  onDragStart: (deckId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (deckId: string) => void;

  onToggleFavorite: (deckId: string) => void;
  onToggleLearned: (deckId: string) => void;
  onEdit: (deck: UIDeck, e: React.MouseEvent) => void;
  onDelete: (deckId: string) => void;
  deleting: boolean;

  onOpenPublish: (deck: UIDeck, e: React.MouseEvent) => void;
  onOpenUnpublish: (deck: UIDeck, e: React.MouseEvent) => void;
  onShare: (deck: UIDeck, e: React.MouseEvent) => void;
}

export function DeckCard({
  deck,
  sortOption,
  userId,
  favoritePending = false,
  learnedPending = false,
  onDeckClick,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleFavorite,
  onToggleLearned,
  onEdit,
  onDelete,
  deleting,
  onOpenPublish,
  onOpenUnpublish,
  onShare,
}: DeckCardProps) {
  const isOwner = deck.userId === userId;
  const isDraggingMode = sortOption === "custom";

  // While deleting, don't allow other actions (prevents odd double-interactions)
  const actionsDisabled = deleting;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={() => onDrop(deck.id)}
      className={`bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-md hover:shadow-xl transition-all group relative overflow-hidden w-full border border-transparent dark:border-gray-700 ${
        isDraggingMode ? "cursor-default" : "cursor-pointer"
      }`}
    >
      {/* Drag handle ONLY (so clicking the card still works) */}
      {isDraggingMode && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              onDragStart(deck.id);
            }}
            className="cursor-move p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      <div className="w-full">
        {/* ✅ CLICK ALWAYS NAVIGATES (even when sortOption === "custom") */}
        <button
          onClick={() => onDeckClick(deck.id)}
          className="w-full text-left"
          type="button"
        >
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: deck.color }}
          >
            {deck.emoji}
          </div>

          <h3 className="mb-2 truncate dark:text-gray-100">{deck.name}</h3>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deck.cardCount || 0} {deck.cardCount === 1 ? "card" : "cards"}
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
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                    deck.difficulty === "beginner"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : deck.difficulty === "intermediate"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        : deck.difficulty === "advanced"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                          : deck.difficulty === "expert"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400"
                  }`}
                >
                  {deck.difficulty === "beginner"
                    ? "🟢"
                    : deck.difficulty === "intermediate"
                      ? "🟡"
                      : deck.difficulty === "advanced"
                        ? "🟠"
                        : deck.difficulty === "expert"
                          ? "🔴"
                          : "🌈"}{" "}
                  {deck.difficulty.charAt(0).toUpperCase() +
                    deck.difficulty.slice(1)}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Actions row */}
        <div className="flex items-center gap-1 mt-3">
          <Button
            variant="ghost"
            size="icon"
            aria-pressed={!!deck.isFavorite}
            disabled={actionsDisabled || favoritePending}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(deck.id);
            }}
            className={`h-7 w-7 transition-colors ${
              deck.isFavorite
                ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
            } ${
              actionsDisabled || favoritePending
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            title="Favorite"
          >
            <Star
              className={`w-4 h-4 ${deck.isFavorite ? "fill-yellow-500" : ""}`}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-pressed={!!deck.isLearned}
            disabled={actionsDisabled || learnedPending}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLearned(deck.id);
            }}
            className={`h-7 w-7 transition-colors ${
              deck.isLearned
                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
            } ${
              actionsDisabled || learnedPending
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            title="Learned"
          >
            <CheckCircle
              className={`w-4 h-4 ${deck.isLearned ? "fill-emerald-600" : ""}`}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={actionsDisabled}
            onClick={(e) => onEdit(deck, e)}
            className={`h-7 w-7 transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50 ${
              actionsDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Edit"
          >
            <FileEdit className="w-4 h-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                disabled={deleting}
                className={`h-7 w-7 transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50 ${
                  deleting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Deck?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{deck.name}" and all its cards.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(deck.id)}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {!deck.isPublished && isOwner && !deck.sourceCommunityDeckId && (
            <Button
              variant="ghost"
              size="icon"
              disabled={actionsDisabled}
              onClick={(e) => onOpenPublish(deck, e)}
              className={`h-7 w-7 transition-colors text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 ${
                actionsDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title="Publish to Community"
            >
              <Upload className="w-4 h-4" />
            </Button>
          )}

          {deck.isPublished && isOwner && (
            <>
              <Button
                variant="ghost"
                size="icon"
                disabled={actionsDisabled}
                onClick={(e) => onOpenPublish(deck, e)}
                className={`h-7 w-7 transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50 ${
                  actionsDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Update Published Deck"
              >
                <Upload className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                disabled={actionsDisabled}
                onClick={(e) => onOpenUnpublish(deck, e)}
                className={`h-7 w-7 transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50 ${
                  actionsDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Unpublish from Community"
              >
                <Upload className="w-4 h-4 rotate-180" />
              </Button>
            </>
          )}

          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              disabled={actionsDisabled}
              onClick={(e) => onShare(deck, e)}
              className={`h-7 w-7 transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50 ${
                actionsDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title="Share Deck"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
