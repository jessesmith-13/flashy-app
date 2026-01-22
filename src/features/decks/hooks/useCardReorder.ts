import { useCallback, useState } from "react";
import { toast } from "sonner";
import { handleAuthError } from "@/features/auth/authErrorHandler";
import { updateCardPositions as apiReorderCard } from "@/shared/api/decks";

type CardLike = { id: string; position?: number };

type UpdateCardFn = (cardId: string, updates: Partial<CardLike>) => void;

export function useCardReorder(
  deckCards: CardLike[],
  updateCard: UpdateCardFn,
  accessToken: string | null | undefined,
  selectedDeckId: string | null | undefined,
) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);

  const handleReorderCards = useCallback(
    async (cardId: string, newIndex: number) => {
      if (!accessToken || !selectedDeckId) return;

      const originalCards = [...deckCards];

      try {
        const currentCards = [...deckCards];
        const draggedIndex = currentCards.findIndex((c) => c.id === cardId);
        if (draggedIndex === -1) return;

        const [draggedCardItem] = currentCards.splice(draggedIndex, 1);
        currentCards.splice(newIndex, 0, draggedCardItem);

        const updatedCards = currentCards.map((card, index) => ({
          ...card,
          position: index,
        }));

        // optimistic store updates
        updatedCards.forEach((card) =>
          updateCard(card.id, { position: card.position }),
        );

        const positions = updatedCards.map((card, index) => ({
          id: card.id,
          position: index,
        }));

        await apiReorderCard(accessToken, selectedDeckId, positions);
      } catch (error) {
        // rollback on failure
        originalCards.forEach((card) =>
          updateCard(card.id, { position: card.position }),
        );

        handleAuthError(error);
        console.error("Failed to reorder cards:", error);
        toast.error("Failed to reorder cards");
      }
    },
    [accessToken, selectedDeckId, deckCards, updateCard],
  );

  const onCardDragStart = useCallback((cardId: string) => {
    setDraggedCard(cardId);
  }, []);

  const onCardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onCardDrop = useCallback(
    (cardId: string) => {
      if (!draggedCard || draggedCard === cardId) {
        setDraggedCard(null);
        return;
      }

      const dropIndex = deckCards.findIndex((c) => c.id === cardId);
      if (dropIndex !== -1) {
        void handleReorderCards(draggedCard, dropIndex);
      }

      setDraggedCard(null);
    },
    [deckCards, draggedCard, handleReorderCards],
  );

  return { draggedCard, onCardDragStart, onCardDragOver, onCardDrop };
}
