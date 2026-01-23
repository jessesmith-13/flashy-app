import { useCallback } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";
import type { UICommunityDeck } from "@/types/community";
import type { UIDeck, UICard, DifficultyLevel } from "@/types/decks";

// Make a UIDeck from a community deck (for temporary study)
function toTempUIDeck(deck: UICommunityDeck): UIDeck {
  const now = new Date().toISOString();

  return {
    id: deck.id,
    userId: deck.ownerId ?? "", // required by UIDeck
    name: deck.name,
    emoji: deck.emoji ?? "📚",
    color: deck.color ?? "#10B981",
    cardCount: deck.cards?.length ?? deck.cardCount ?? 0,
    category: deck.category ?? "",
    subtopic: deck.subtopic ?? "",
    createdAt: deck.createdAt ?? now,
    updatedAt: now,

    // required booleans
    isPublic: true,
    isPublished: true,

    // required by UIDeck
    difficulty: (deck.difficulty as DifficultyLevel) ?? "beginner",

    // if your UIDeck has these fields, keep them (remove if not in your type)
    sourceCommunityDeckId: deck.id ?? null,
    communityPublishedId: null,
    importedFromVersion: null,
    isDeleted: false,
    lastSyncedAt: null,

    frontLanguage: deck.frontLanguage ?? null,
    backLanguage: deck.backLanguage ?? null,
  };
}

export function useCommunityStudyNavigation() {
  const { setTemporaryStudyDeck, setReturnToCommunityDeck } = useStore();
  const { navigateTo } = useNavigation();

  const studyCommunityDeck = useCallback(
    (deck: UICommunityDeck) => {
      const tempDeck = toTempUIDeck(deck);

      // Ensure cards satisfy UICard shape (if your community cards are already UICard, you can skip mapping)
      const tempCards: UICard[] = (deck.cards ?? []).map((c, idx) => ({
        ...c,
        deckId: tempDeck.id,
        position: c.position ?? idx,
        favorite: false,
        isIgnored: false,
        createdAt: c.createdAt ?? new Date().toISOString(),
        updatedAt: c.updatedAt ?? new Date().toISOString(),
      }));

      setTemporaryStudyDeck({
        deck: tempDeck,
        cards: tempCards,
      });

      setReturnToCommunityDeck(deck);
      navigateTo("study");
    },
    [navigateTo, setReturnToCommunityDeck, setTemporaryStudyDeck],
  );

  return { studyCommunityDeck };
}
