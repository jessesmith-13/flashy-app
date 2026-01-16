import { useState, useEffect } from "react";
import { CardItem } from "./CardItem";
import { Pagination } from "@/components/Pagination/Pagination";
import {
  Eye,
  Star,
  EyeOff,
  ArrowUpDown,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
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
import type { UICard } from "@/types/decks";

interface CardListProps {
  cards: UICard[];
  onEditCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleFavorite: (cardId: string) => void;
  onToggleIgnored: (cardId: string) => void;
  onCardDragStart: (cardId: string) => void;
  onCardDragOver: (e: React.DragEvent) => void;
  onCardDrop: (cardId: string) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onToggleCardSelection: (cardId: string) => void;
  onSelectAll: (cardIds: string[]) => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  selectedCards: Set<string>;
}

const ITEMS_PER_PAGE = 20;

export function CardList({
  cards,
  onEditCard,
  onDeleteCard,
  onToggleFavorite,
  onToggleIgnored,
  onCardDragStart,
  onCardDragOver,
  onCardDrop,
  selectionMode,
  onToggleSelectionMode,
  onToggleCardSelection,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  selectedCards,
}: CardListProps) {
  const [filterTab, setFilterTab] = useState<"all" | "favorites" | "ignored">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"position" | "favorites" | "ignored">(
    "position"
  );
  const [currentPage, setCurrentPage] = useState(1);

  const getSortedAndFilteredCards = () => {
    let filtered = [...cards];

    if (filterTab === "favorites") {
      filtered = filtered.filter((card) => card.favorite);
    } else if (filterTab === "ignored") {
      filtered = filtered.filter((card) => card.isIgnored);
    }

    // Then sort
    if (sortBy === "favorites") {
      filtered.sort((a, b) => {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return (a.position || 0) - (b.position || 0);
      });
    } else if (sortBy === "ignored") {
      filtered.sort((a, b) => {
        if (a.isIgnored && !b.isIgnored) return -1;
        if (!a.isIgnored && b.isIgnored) return 1;
        return (a.position || 0) - (b.position || 0);
      });
    } else {
      filtered.sort((a, b) => (a.position || 0) - (b.position || 0));
    }

    return filtered;
  };

  const filteredAndSortedCards = getSortedAndFilteredCards();
  const totalPages = Math.ceil(filteredAndSortedCards.length / ITEMS_PER_PAGE);
  const paginatedCards = filteredAndSortedCards.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, sortBy]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-gray-600 dark:text-gray-400 mb-2">No cards yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Add your first card to start studying!
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection toolbar */}
      {selectionMode && (
        <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-purple-900 dark:text-purple-100">
              {selectedCards.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectAll(paginatedCards.map((c) => c.id))}
                className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All (Page)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeselectAll}
                className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
              >
                <Square className="w-4 h-4 mr-2" />
                Deselect All
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedCards.size === 0}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedCards.size > 0 && `(${selectedCards.size})`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selectedCards.size} card
                    {selectedCards.size === 1 ? "" : "s"}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the selected card{selectedCards.size === 1 ? "" : "s"} from
                    this deck.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onBulkDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSelectionMode}
              className="border-gray-300 dark:border-gray-600"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-2 sm:px-4 py-2 rounded-md transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
              filterTab === "all"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">All </span>({cards.length})
          </button>
          <button
            onClick={() => setFilterTab("favorites")}
            className={`px-2 sm:px-4 py-2 rounded-md transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
              filterTab === "favorites"
                ? "bg-yellow-500 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                filterTab === "favorites" ? "fill-white" : ""
              }`}
            />
            <span className="hidden sm:inline">Favorites </span>(
            {cards.filter((c) => c.favorite).length})
          </button>
          <button
            onClick={() => setFilterTab("ignored")}
            className={`px-2 sm:px-4 py-2 rounded-md transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
              filterTab === "ignored"
                ? "bg-gray-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <EyeOff className="w-4 h-4" />
            <span className="hidden sm:inline">Ignored </span>(
            {cards.filter((c) => c.isIgnored).length})
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!selectionMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSelectionMode}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Select
            </Button>
          )}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "position" | "favorites" | "ignored"
                )
              }
              className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="position">Default Order</option>
              <option value="favorites">Favorites First</option>
              <option value="ignored">Ignored First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty state for filtered views */}
      {filteredAndSortedCards.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">
            {filterTab === "favorites" ? "⭐" : "👁️"}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {filterTab === "favorites"
              ? "No favorite cards yet"
              : "No ignored cards"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {filterTab === "favorites"
              ? "Mark cards as favorites to see them here!"
              : "Ignored cards will appear here."}
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
                selectionMode={selectionMode}
                onToggleCardSelection={onToggleCardSelection}
                selected={selectedCards.has(card.id)}
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
  );
}
