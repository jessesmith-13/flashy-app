import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/shared/state/useStore";
import { fetchDecks, fetchCards } from "@/shared/api/decks";
import type { UICard, UIDeck } from "@/types/decks";

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

export function useAllCards() {
  const { accessToken, cards, decks, setCards, setDecks, setStudyAllCards } =
    useStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAllCards = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // IMPORTANT: fetchDecks returns UIDeck[] (UI shape)
      const allDecks = (await fetchDecks(accessToken)) as UIDeck[];
      setDecks(allDecks);

      const cardsArrays = await Promise.all(
        allDecks.map((deck) => fetchCards(accessToken, deck.id)),
      );

      const allCards = dedupeById(cardsArrays.flat() as UICard[]);
      setCards(allCards);
    } catch (err) {
      console.error("Failed to load cards:", err);
      toast.error("Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, [accessToken, setCards, setDecks]);

  useEffect(() => {
    loadAllCards();
  }, [loadAllCards]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cards;

    return cards.filter((card) => {
      const front = card.front?.toLowerCase() ?? "";
      const back = card.back?.toLowerCase() ?? "";
      return front.includes(q) || back.includes(q);
    });
  }, [cards, searchQuery]);

  const deckById = useMemo(() => {
    const map = new Map(decks.map((d) => [d.id, d]));
    return map;
  }, [decks]);

  const startStudyAll = () => {
    setStudyAllCards(true);
  };

  return {
    loading,
    searchQuery,
    setSearchQuery,
    cards,
    filteredCards,
    deckById,
    loadAllCards,
    startStudyAll,
  };
}
