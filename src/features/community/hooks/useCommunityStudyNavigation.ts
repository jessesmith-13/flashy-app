import { useCallback } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation"; // adjust path if yours differs
import type { UICommunityDeck } from "@/types/community";
import type { UISharedDeck } from "@/types/study";

/**
 * Convert a community deck into the shared "study" deck shape.
 * This avoids unsafe casts and makes sure the study page always gets what it needs.
 */
function toSharedDeck(deck: UICommunityDeck): UISharedDeck {
  return {
    id: deck.id,
    name: deck.name,
    emoji: deck.emoji ?? "📚",
    color: deck.color ?? "#10B981",
    // These fields might differ in your types — adjust as needed:
    cardCount: deck.cards?.length ?? deck.cardCount ?? 0,
    category: deck.category ?? "",
    subtopic: deck.subtopic ?? "",
    ownerId: deck.ownerId,
    ownerDisplayName: deck.ownerDisplayName ?? "Unknown",
    publishedAt: deck.publishedAt ?? new Date().toISOString(),
    downloadCount: deck.downloadCount ?? 0,
    createdAt: deck.createdAt ?? new Date().toISOString(),
    frontLanguage: deck.frontLanguage ?? null,
    backLanguage: deck.backLanguage ?? null,
    cards: deck.cards ?? [],
  };
}

export function useCommunityStudyNavigation() {
  const { setTemporaryStudyDeck, setReturnToCommunityDeck } = useStore();
  const { navigateTo } = useNavigation();

  const studyCommunityDeck = useCallback(
    (deck: UICommunityDeck) => {
      const shared = toSharedDeck(deck);

      setTemporaryStudyDeck({
        deck: shared,
        cards: shared.cards,
      });

      setReturnToCommunityDeck(deck);
      navigateTo("study");
    },
    [navigateTo, setReturnToCommunityDeck, setTemporaryStudyDeck],
  );

  return { studyCommunityDeck };
}
