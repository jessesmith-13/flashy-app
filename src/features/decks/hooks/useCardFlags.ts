import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { UICard, UIDeck } from "@/types/decks";
import { updateCard as apiUpdateCard } from "@/shared/api/decks";
import { handleAuthError } from "@/features/auth/authErrorHandler";

type ToggleKey = "favorite" | "isIgnored";

type UseCardFlagsArgs = {
  accessToken: string | null;
  deck: UIDeck | null;
  deckCards: UICard[];
  updateCardInStore: (cardId: string, patch: Partial<UICard>) => void;
};

export function useCardFlags({
  accessToken,
  deck,
  deckCards,
  updateCardInStore,
}: UseCardFlagsArgs) {
  const [pendingByCardId, setPendingByCardId] = useState<
    Record<string, Partial<Record<ToggleKey, boolean>>>
  >({});

  const setPending = useCallback(
    (cardId: string, key: ToggleKey, value: boolean) => {
      setPendingByCardId((prev) => {
        const cardPending = prev[cardId] ?? {};
        const nextCardPending = { ...cardPending, [key]: value };

        const hasAny = Object.values(nextCardPending).some(Boolean);
        if (!hasAny) {
          const copy = { ...prev };
          delete copy[cardId];
          return copy;
        }

        return { ...prev, [cardId]: nextCardPending };
      });
    },
    [],
  );

  const isPending = useCallback(
    (cardId: string, key: ToggleKey) => !!pendingByCardId[cardId]?.[key],
    [pendingByCardId],
  );

  const require = useCallback((): { token: string; deckId: string } | null => {
    if (!accessToken) {
      toast.error("Please log in");
      return null;
    }
    if (!deck?.id) return null;
    return { token: accessToken, deckId: deck.id };
  }, [accessToken, deck?.id]);

  const toggle = useCallback(
    async (cardId: string, key: ToggleKey) => {
      const req = require();
      if (!req) return;
      if (isPending(cardId, key)) return;

      const card = deckCards.find((c) => c.id === cardId);
      if (!card) return;

      const prev = Boolean(card[key]);
      const next = !prev;

      // optimistic
      updateCardInStore(cardId, { [key]: next } as Partial<UICard>);
      setPending(cardId, key, true);

      try {
        await apiUpdateCard(req.token, req.deckId, cardId, { [key]: next });
        toast.success(
          key === "favorite"
            ? next
              ? "Added to favorites"
              : "Removed from favorites"
            : next
              ? "Card ignored"
              : "Card unignored",
        );
      } catch (err: unknown) {
        // revert
        updateCardInStore(cardId, { [key]: prev } as Partial<UICard>);
        handleAuthError(err);
        toast.error(
          key === "favorite"
            ? "Failed to update favorite status"
            : "Failed to update ignored status",
        );
      } finally {
        setPending(cardId, key, false);
      }
    },
    [deckCards, isPending, require, setPending, updateCardInStore],
  );

  const onToggleFavorite = useCallback(
    async (cardId: string) => toggle(cardId, "favorite"),
    [toggle],
  );

  const onToggleIgnored = useCallback(
    async (cardId: string) => toggle(cardId, "isIgnored"),
    [toggle],
  );

  return {
    onToggleFavorite,
    onToggleIgnored,
    isCardFlagPending: isPending,
  };
}
