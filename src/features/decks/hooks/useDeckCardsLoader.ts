// useDeckCardsLoader.ts
import { useCallback } from "react";
import { toast } from "sonner";
import { fetchCards as apiFetchCards } from "@/shared/api/decks";
import { handleAuthError } from "@/features/auth/authErrorHandler";
import { useStore } from "@/shared/state/useStore";

export function useDeckCardsLoader(setLoading: (v: boolean) => void) {
  const { accessToken, selectedDeckId, setCards } = useStore();

  return useCallback(async () => {
    if (!accessToken || !selectedDeckId) return;

    try {
      const fetchedCards = await apiFetchCards(accessToken, selectedDeckId);
      setCards(fetchedCards);
    } catch (error) {
      handleAuthError(error);
      toast.error(
        "Failed to load cards. Please check the console for details.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedDeckId, setCards, setLoading]);
}
