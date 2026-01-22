import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UICommunityDeck } from "../../../../types/community";

const toastErrorMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

/**
 * IMPORTANT:
 * Mock the community API module so we never import Supabase runtime in tests/CI.
 */
vi.mock("../../../../shared/api/community", () => ({
  fetchCommunityDecks: vi.fn(),
  fetchFeaturedCommunityDecks: vi.fn(),
  fetchDownloadCounts: vi.fn(),
  getDeckRatings: vi.fn(),
  getCommunityDeck: vi.fn(),
}));

import {
  fetchCommunityDecks,
  fetchFeaturedCommunityDecks,
  fetchDownloadCounts,
  getDeckRatings,
  getCommunityDeck,
} from "../../../../shared/api/community";

// typed helpers for mocked fns
const fetchCommunityDecksMock = vi.mocked(fetchCommunityDecks);
const fetchFeaturedCommunityDecksMock = vi.mocked(fetchFeaturedCommunityDecks);
const fetchDownloadCountsMock = vi.mocked(fetchDownloadCounts);
const getDeckRatingsMock = vi.mocked(getDeckRatings);
const getCommunityDeckMock = vi.mocked(getCommunityDeck);

function makeDeck(overrides: Partial<UICommunityDeck> = {}): UICommunityDeck {
  const now = new Date().toISOString();

  // put required base values first
  const base: UICommunityDeck = {
    // ---- snake_case (CommunityDeck base) ----
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
    difficulty: null, // or a real enum value if required

    published_at: null,
    created_at: now,
    updated_at: now,

    download_count: 5,
    source_content_updated_at: null,

    // ---- camelCase (UICommunityDeck additions) ----
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

    // overrides last
    ...overrides,
  };

  // defensive: keep snake_case + camelCase in sync if overrides set one side
  return {
    ...base,
    owner_id: overrides.owner_id ?? base.owner_id,
    ownerId: overrides.ownerId ?? base.ownerId,
  };
}

describe("useCommunityDecks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastErrorMock.mockClear();
  });

  it("loads community and featured decks with ratings and downloads", async () => {
    // Import the hook AFTER mocks are in place (safe in vitest, but this is extra-safe)
    const { useCommunityDecks } = await import("../useCommunityDecks");

    fetchCommunityDecksMock.mockResolvedValue([makeDeck({ id: "deck-1" })]);
    fetchFeaturedCommunityDecksMock.mockResolvedValue([
      makeDeck({ id: "deck-1", featured: true }),
    ]);

    fetchDownloadCountsMock.mockResolvedValue({ "deck-1": 10 });

    getDeckRatingsMock.mockResolvedValue({
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

    // Assert fields that actually exist on UICommunityDeck (no casts)
    expect(result.current.communityDecks[0]!.downloadCount).toBe(10);
    expect(result.current.communityDecks[0]!.averageRating).toBe(4.5);
    expect(result.current.communityDecks[0]!.ratingCount).toBe(20);

    expect(result.current.featuredDecks).toHaveLength(1);
  });

  it("returns null when fetching a missing deck", async () => {
    const { useCommunityDecks } = await import("../useCommunityDecks");

    getCommunityDeckMock.mockResolvedValue(null);

    const { result } = renderHook(() => useCommunityDecks());

    let deck: UICommunityDeck | null = null;

    await act(async () => {
      deck = await result.current.fetchDeckById("missing-id");
    });

    expect(deck).toBeNull();
  });
});
