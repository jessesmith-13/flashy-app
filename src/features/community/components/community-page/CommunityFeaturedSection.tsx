import { useMemo } from "react";
import type { UICommunityDeck } from "@/types/community";

type Props = {
  featuredDecks: UICommunityDeck[];
  filteredAndSortedDecks: UICommunityDeck[];

  normalizedSearchQuery: string;
  filterCategory: string;
  showFeaturedOnly: boolean;

  renderFeatured: (decks: UICommunityDeck[]) => React.ReactNode;
  renderMain: (decks: UICommunityDeck[]) => React.ReactNode;
};

export function CommunityFeaturedSection({
  featuredDecks,
  filteredAndSortedDecks,
  normalizedSearchQuery,
  filterCategory,
  showFeaturedOnly,
  renderFeatured,
  renderMain,
}: Props) {
  const showingFeaturedSection = useMemo(() => {
    return (
      featuredDecks.length > 0 &&
      !normalizedSearchQuery &&
      filterCategory === "all" &&
      !showFeaturedOnly
    );
  }, [
    featuredDecks.length,
    normalizedSearchQuery,
    filterCategory,
    showFeaturedOnly,
  ]);

  const featuredDeckIds = useMemo(() => {
    return new Set(featuredDecks.map((d) => d.id));
  }, [featuredDecks]);

  const decksForMainGrid = useMemo(() => {
    if (!showingFeaturedSection) return filteredAndSortedDecks;
    return filteredAndSortedDecks.filter((d) => !featuredDeckIds.has(d.id));
  }, [filteredAndSortedDecks, showingFeaturedSection, featuredDeckIds]);

  return (
    <>
      {showingFeaturedSection && renderFeatured(featuredDecks)}
      {renderMain(decksForMainGrid)}
    </>
  );
}
