import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCommunityDecks } from "../useCommunityDecks";
import * as communityApi from "../../../../shared/api/community";
import type { UICommunityDeck } from "../../../../types/community";

const toastErrorMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

function makeDeck(overrides: Partial<UICommunityDeck> = {}): UICommunityDeck {
  const now = new Date().toISOString();

  // NOTE:
  // Your UICommunityDeck type is `CommunityDeck & { ...camelCase... }`,
  // so it REQUIRES both snake_case (CommunityDeck) and camelCase (UI fields).
  // We keep assertions + overrides camelCase, but still satisfy the intersection type.
  const base: UICommunityDeck = {
    // -------------------------
    // CommunityDeck (snake_case)
    // -------------------------
    id: "deck-1",
    owner_id: "user-1",
    original_deck_id: null,

    name: "Test Deck",
    description: null,
    category: null,
    subtopic: null,

    card_count: 0,
    import_count: 0,

    featured: false,
    is_flagged: false,
    is_published: true,
    is_deleted: false,

    version: 1,

    owner_name: null,
    owner_display_name: "Someone",
    owner_avatar: null,

    average_rating: null,
    rating_count: 0,

    front_language: null,
    back_language: null,
    color: "#10B981",
    emoji: "📚",
    difficulty: null,

    published_at: null,
    created_at: now,
    updated_at: now,

    download_count: 5,
    source_content_updated_at: null,

    // -------------------------
    // UICommunityDeck (camelCase)
    // -------------------------
    ownerId: "user-1",
    originalDeckId: null,

    cardCount: 0,
    importCount: 0,

    isFlagged: false,
    isPublished: true,
    isDeleted: false,

    ownerName: null,
    ownerDisplayName: "Someone",
    ownerAvatar: null,

    averageRating: null,
    ratingCount: 0,

    frontLanguage: null,
    backLanguage: null,

    publishedAt: null,
    createdAt: now,
    updatedAt: now,

    downloadCount: 5,

    cards: [],
    sourceContentUpdatedAt: null,

    commentCount: 0,
  };

  return { ...base, ...overrides };
}

describe("useCommunityDecks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toastErrorMock.mockClear();
  });

  it("loads community and featured decks with ratings and downloads", async () => {
    vi.spyOn(communityApi, "fetchCommunityDecks").mockResolvedValue([
      makeDeck({ id: "deck-1", downloadCount: 5 }),
    ]);

    // The API file is typed oddly, but hook normalizes featured decks.
    // Return a single deck to satisfy the declared type without casts.
    vi.spyOn(communityApi, "fetchFeaturedCommunityDecks").mockResolvedValue(
      makeDeck({ id: "deck-1", featured: true }),
    );

    vi.spyOn(communityApi, "fetchDownloadCounts").mockResolvedValue({
      "deck-1": 10,
    });

    vi.spyOn(communityApi, "getDeckRatings").mockResolvedValue({
      averageRating: 4.5,
      totalRatings: 20,
      userRating: null,
    });

    const { result } = renderHook(() => useCommunityDecks());

    await act(async () => {
      await result.current.loadCommunityDecks();
    });

    expect(result.current.loading).toBe(false);

    expect(result.current.communityDecks).toHaveLength(1);
    const deck = result.current.communityDecks[0];

    // ✅ camelCase assertions (no any)
    expect(deck.downloadCount).toBe(10);
    expect(deck.averageRating).toBe(4.5);
    expect(deck.ratingCount).toBe(20);

    expect(result.current.featuredDecks).toHaveLength(1);
  });

  it("returns null when fetching a missing deck", async () => {
    vi.spyOn(communityApi, "getCommunityDeck").mockResolvedValue(null);

    const { result } = renderHook(() => useCommunityDecks());

    let deck: UICommunityDeck | null = null;
    await act(async () => {
      deck = await result.current.fetchDeckById("missing-id");
    });

    expect(deck).toBeNull();
  });
});
