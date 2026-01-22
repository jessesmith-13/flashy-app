import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { UIDeck, UICard } from "@/types/decks";
import { deleteDeck as apiDeleteDeck } from "@/shared/api/decks";
import { handleAuthError } from "@/features/auth/authErrorHandler";

export function useDeckDetailActions(args: {
  accessToken: string | null | undefined;
  deck: UIDeck | null | undefined;
  deckCards: UICard[];
  removeDeck: (deckId: string) => void;
  navigateTo: (route: string) => void;
}) {
  const { accessToken, deck, deckCards, removeDeck, navigateTo } = args;

  const [deletingDeck, setDeletingDeck] = useState(false);

  const handleDeleteDeck = useCallback(async () => {
    if (!accessToken || !deck) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${deck.name}"? This will delete all ${deckCards.length} cards in this deck. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingDeck(true);
    try {
      await apiDeleteDeck(accessToken, deck.id);
      removeDeck(deck.id);
      navigateTo("decks");
      toast.success("Deck deleted successfully!");
    } catch (err) {
      handleAuthError(err);
      console.error("Failed to delete deck:", err);
      toast.error("Failed to delete deck");
    } finally {
      setDeletingDeck(false);
    }
  }, [accessToken, deck, deckCards.length, navigateTo, removeDeck]);

  const handleStartStudy = useCallback(() => {
    if (!deck) return;

    if (deckCards.length === 0) {
      toast.error("Add some cards to this deck before studying!");
      return;
    }

    navigateTo("study-options");
  }, [deck, deckCards.length, navigateTo]);

  return {
    deletingDeck,
    handleDeleteDeck,
    handleStartStudy,
  };
}
