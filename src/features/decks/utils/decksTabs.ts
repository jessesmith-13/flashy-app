// src/features/decks/utils/decksTabs.ts
import type { UIDeck } from "@/types/decks";

export function getDeckTabCounts(decks: UIDeck[]) {
  const notDeleted = decks.filter((d) => !d.isDeleted);

  const favorites = notDeleted.filter((d) => !!d.isFavorite).length;
  const learned = notDeleted.filter((d) => !!d.isLearned).length;

  const added = notDeleted.filter(
    (d) => !!d.isCommunity || !!d.isShared,
  ).length;

  const created = notDeleted.filter(
    (d) => !d.isCommunity && !d.isShared,
  ).length;

  const published = notDeleted.filter((d) => !!d.isPublished).length;

  const unpublished = notDeleted.filter(
    (d) => !d.sourceCommunityDeckId && !d.isShared && !d.isPublished,
  ).length;

  return {
    all: notDeleted.length,
    favorites,
    learned,
    added,
    created,
    published,
    unpublished,
  };
}
