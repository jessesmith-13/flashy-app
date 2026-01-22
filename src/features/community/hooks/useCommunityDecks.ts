import { useCallback, useState } from "react";
import {
  fetchCommunityDecks,
  fetchFeaturedCommunityDecks,
  fetchDownloadCounts,
  getCommunityDeck,
  getDeckRatings,
} from "@/shared/api/community";
import type { UICommunityDeck } from "@/types/community";
import { toast } from "sonner";

type DeckRatings = {
  averageRating: number;
  totalRatings: number;
  userRating: number | null;
};

type DeckRatingsMap = Record<string, DeckRatings>;
type DownloadCountsMap = Record<string, number>;

function normalizeFeatured(
  featured: UICommunityDeck | UICommunityDeck[] | null | undefined,
): UICommunityDeck[] {
  if (!featured) return [];
  return Array.isArray(featured) ? featured : [featured];
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

export function useCommunityDecks() {
  const [communityDecks, setCommunityDecks] = useState<UICommunityDeck[]>([]);
  const [featuredDecks, setFeaturedDecks] = useState<UICommunityDeck[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadCommunityDecks = useCallback(async () => {
    setLoading(true);

    try {
      const [publishedDecks, featuredPublishedDecks] = await withTimeout(
        Promise.all([fetchCommunityDecks(), fetchFeaturedCommunityDecks()]),
        15000,
        "fetch community decks",
      );

      const allDecks: UICommunityDeck[] = publishedDecks ?? [];
      const allDeckIds: string[] = allDecks.map((d) => d.id);

      const downloadCounts: DownloadCountsMap =
        allDeckIds.length > 0
          ? await withTimeout(
              fetchDownloadCounts(allDeckIds),
              15000,
              "fetch download counts",
            )
          : {};

      const ratingsData: DeckRatings[] = await Promise.all(
        allDeckIds.map(async (id): Promise<DeckRatings> => {
          try {
            const r = await withTimeout(
              getDeckRatings(id),
              15000,
              `getDeckRatings(${id})`,
            );
            return {
              averageRating: Number(r?.averageRating ?? 0),
              totalRatings: Number(r?.totalRatings ?? 0),
              userRating: (r?.userRating ?? null) as number | null,
            };
          } catch {
            return { averageRating: 0, totalRatings: 0, userRating: null };
          }
        }),
      );

      const ratingsMap: DeckRatingsMap = allDeckIds.reduce<DeckRatingsMap>(
        (acc, id, index) => {
          acc[id] = ratingsData[index]!;
          return acc;
        },
        {},
      );

      // IMPORTANT: update existing camelCase fields (no “downloads/rating” extra props)
      const updatedDecks: UICommunityDeck[] = allDecks.map((deck) => ({
        ...deck,
        downloadCount: downloadCounts[deck.id] ?? deck.downloadCount ?? 0,
        averageRating:
          ratingsMap[deck.id]?.averageRating ?? deck.averageRating ?? 0,
        ratingCount: ratingsMap[deck.id]?.totalRatings ?? deck.ratingCount ?? 0,
      }));

      const featuredArray = normalizeFeatured(featuredPublishedDecks);
      const updatedFeaturedDecks: UICommunityDeck[] = featuredArray.map(
        (deck) => ({
          ...deck,
          downloadCount: downloadCounts[deck.id] ?? deck.downloadCount ?? 0,
          averageRating:
            ratingsMap[deck.id]?.averageRating ?? deck.averageRating ?? 0,
          ratingCount:
            ratingsMap[deck.id]?.totalRatings ?? deck.ratingCount ?? 0,
        }),
      );

      setCommunityDecks(updatedDecks);
      setFeaturedDecks(updatedFeaturedDecks);
    } catch (error) {
      console.error("Failed to load community decks:", error);
      toast.error("Failed to load community decks");
      setCommunityDecks([]);
      setFeaturedDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeckById = useCallback(
    async (deckId: string): Promise<UICommunityDeck | null> => {
      try {
        const deck = await withTimeout(
          getCommunityDeck(deckId),
          15000,
          `getCommunityDeck(${deckId})`,
        );
        if (!deck) {
          toast.error(
            "This deck is not available in the community. It may have been deleted.",
          );
          return null;
        }
        return deck;
      } catch (error) {
        console.error("Failed to fetch deck:", error);
        toast.error(
          "This deck is not available in the community. It may have been deleted.",
        );
        return null;
      }
    },
    [],
  );

  return {
    communityDecks,
    featuredDecks,
    loading,
    loadCommunityDecks,
    fetchDeckById,
  };
}
