// useCommunityDeckAuthor.ts
import { useCallback, useState } from "react";
import { fetchCommunityDecks as apiFetchCommunityDecks } from "@/shared/api/community";
import type { UICommunityDeck } from "@/types/community";

export function useCommunityDeckAuthor() {
  const [author, setAuthor] = useState<{ id: string; name: string } | null>(
    null,
  );

  const loadAuthor = useCallback(async (communityDeckId: string) => {
    try {
      const publishedDecks = await apiFetchCommunityDecks();
      const communityDeck = publishedDecks.find(
        (d: UICommunityDeck) => d.id === communityDeckId,
      );
      if (communityDeck) {
        setAuthor({
          id: communityDeck.ownerId,
          name: communityDeck.ownerDisplayName || "Unknown",
        });
      }
    } catch (e) {
      console.error("Failed to load community deck author:", e);
    }
  }, []);

  return { communityDeckAuthor: author, loadCommunityDeckAuthor: loadAuthor };
}
