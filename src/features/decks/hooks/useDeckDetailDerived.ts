import { useMemo } from "react";
import { useStore } from "@/shared/state/useStore";

export function useDeckDetailDerived() {
  const { selectedDeckId, decks, cards, studySessions } = useStore();

  const deck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId),
    [decks, selectedDeckId],
  );

  const deckCards = useMemo(
    () => cards.filter((c) => c.deckId === selectedDeckId),
    [cards, selectedDeckId],
  );

  const { studyCount, averageScore } = useMemo(() => {
    const deckStudySessions = selectedDeckId
      ? studySessions.filter((s) => s.deckId === selectedDeckId)
      : [];
    const studyCount = deckStudySessions.length;
    const averageScore =
      studyCount > 0
        ? deckStudySessions.reduce((sum, s) => sum + s.score, 0) / studyCount
        : undefined;

    return { studyCount, averageScore };
  }, [studySessions, selectedDeckId]);

  return { deck, deckCards, studyCount, averageScore };
}
