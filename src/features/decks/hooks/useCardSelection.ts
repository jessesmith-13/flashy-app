import { useCallback, useMemo, useState } from "react";

type HasId = { id: string };

export function useCardSelection(cards: HasId[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const selectedCount = selectedCards.size;

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) setSelectedCards(new Set());
      return next;
    });
  }, []);

  const toggleCard = useCallback((cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedCards(new Set(cards.map((c) => c.id)));
  }, [cards]);

  const deselectAll = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  const clearAndExit = useCallback(() => {
    setSelectedCards(new Set());
    setSelectionMode(false);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedCards.has(id),
    [selectedCards],
  );

  const selectedIds = useMemo(() => Array.from(selectedCards), [selectedCards]);

  return {
    selectionMode,
    selectedCards,
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelectionMode,
    toggleCard,
    selectAll,
    deselectAll,
    clearAndExit,
    setSelectedCards, // keep available if you need rare manual control
  };
}
