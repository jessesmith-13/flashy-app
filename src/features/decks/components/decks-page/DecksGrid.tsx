import type { SortOption, UIDeck } from "@/types/decks";
import { DeckCard } from "./DeckCard";

interface DecksGridProps {
  decks: UIDeck[];
  sortOption: SortOption;
  userId?: string;

  favoritePendingById?: (deckId: string) => boolean;
  learnedPendingById?: (deckId: string) => boolean;

  onDeckClick: (deckId: string) => void;
  onDragStart: (deckId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (deckId: string) => void;

  onToggleFavorite: (deckId: string) => void;
  onToggleLearned: (deckId: string) => void;
  onEdit: (deck: UIDeck, e: React.MouseEvent) => void;
  onDelete: (deckId: string) => void;
  deletingDeckId: string | null;

  onOpenPublish: (deck: UIDeck, e: React.MouseEvent) => void;
  onOpenUnpublish: (deck: UIDeck, e: React.MouseEvent) => void;
  onShare: (deck: UIDeck, e: React.MouseEvent) => void;
}

export function DecksGrid({
  decks,
  sortOption,
  userId,

  favoritePendingById,
  learnedPendingById,

  onDeckClick,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleFavorite,
  onToggleLearned,
  onEdit,
  onDelete,
  deletingDeckId,
  onOpenPublish,
  onOpenUnpublish,
  onShare,
}: DecksGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
      {decks.map((deck) => (
        <DeckCard
          key={deck.id}
          deck={deck}
          sortOption={sortOption}
          userId={userId}
          favoritePending={favoritePendingById?.(deck.id) ?? false}
          learnedPending={learnedPendingById?.(deck.id) ?? false}
          onDeckClick={onDeckClick}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onToggleFavorite={onToggleFavorite}
          onToggleLearned={onToggleLearned}
          onEdit={onEdit}
          onDelete={onDelete}
          deleting={deletingDeckId === deck.id}
          onOpenPublish={onOpenPublish}
          onOpenUnpublish={onOpenUnpublish}
          onShare={onShare}
        />
      ))}
    </div>
  );
}
