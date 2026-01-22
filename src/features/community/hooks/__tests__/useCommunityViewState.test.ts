import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UICommunityDeck } from "../../../../types/community";

function makeDeck(id: string): UICommunityDeck {
  const now = new Date().toISOString();
  return {
    // snake_case base
    id,
    owner_id: "u1",
    original_deck_id: null,
    name: "Deck " + id,
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
    download_count: 0,
    source_content_updated_at: null,

    // camelCase UI
    ownerId: "u1",
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
    downloadCount: 0,
    commentCount: 0,
    cards: [],
    sourceContentUpdatedAt: null,
  };
}

describe("useCommunityViewState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets viewingDeck from returnToCommunityDeck", async () => {
    const { useCommunityViewState } = await import("../useCommunityViewState");

    const deck = makeDeck("d1");

    const setViewingCommunityDeckId = vi.fn();
    const setViewingUserId = vi.fn();

    const { result } = renderHook(() =>
      useCommunityViewState({
        returnToCommunityDeck: deck,
        returnToUserDeck: null,
        viewingCommunityDeckId: null,
        setViewingCommunityDeckId,
        viewingUserId: null,
        setViewingUserId,
        communityDecks: [],
        loading: false,
        fetchDeckById: vi.fn(async () => null),
        targetCardIndex: null,
      }),
    );

    expect(result.current.viewingDeck?.id).toBe("d1");
  });

  it("when viewingCommunityDeckId matches a loaded deck, uses it and clears id", async () => {
    const { useCommunityViewState } = await import("../useCommunityViewState");

    const deck = makeDeck("d1");
    const setViewingCommunityDeckId = vi.fn();
    const setViewingUserId = vi.fn();

    const { result } = renderHook(() =>
      useCommunityViewState({
        returnToCommunityDeck: null,
        returnToUserDeck: null,
        viewingCommunityDeckId: "d1",
        setViewingCommunityDeckId,
        viewingUserId: null,
        setViewingUserId,
        communityDecks: [deck],
        loading: false,
        fetchDeckById: vi.fn(async () => null),
        targetCardIndex: null,
      }),
    );

    expect(result.current.viewingDeck?.id).toBe("d1");
    expect(setViewingCommunityDeckId).toHaveBeenCalledWith(null);
  });

  it("when viewingCommunityDeckId not found, calls fetchDeckById and sets viewingDeck", async () => {
    const { useCommunityViewState } = await import("../useCommunityViewState");

    const fetched = makeDeck("d2");
    const fetchDeckById = vi.fn(async () => fetched);

    const setViewingCommunityDeckId = vi.fn();
    const setViewingUserId = vi.fn();

    const { result } = renderHook(() =>
      useCommunityViewState({
        returnToCommunityDeck: null,
        returnToUserDeck: null,
        viewingCommunityDeckId: "d2",
        setViewingCommunityDeckId,
        viewingUserId: null,
        setViewingUserId,
        communityDecks: [],
        loading: false,
        fetchDeckById,
        targetCardIndex: null,
      }),
    );

    // allow effect to run
    await act(async () => {});

    expect(fetchDeckById).toHaveBeenCalledWith("d2");
    expect(result.current.viewingDeck?.id).toBe("d2");
    expect(setViewingCommunityDeckId).toHaveBeenCalledWith(null);
  });

  it("when viewingUserId is set, selects user and clears it", async () => {
    const { useCommunityViewState } = await import("../useCommunityViewState");

    const setViewingCommunityDeckId = vi.fn();
    const setViewingUserId = vi.fn();

    const { result } = renderHook(() =>
      useCommunityViewState({
        returnToCommunityDeck: null,
        returnToUserDeck: null,
        viewingCommunityDeckId: null,
        setViewingCommunityDeckId,
        viewingUserId: "user-123",
        setViewingUserId,
        communityDecks: [],
        loading: false,
        fetchDeckById: vi.fn(async () => null),
        targetCardIndex: null,
      }),
    );

    expect(result.current.selectedUserId).toBe("user-123");
    expect(setViewingUserId).toHaveBeenCalledWith(null);
  });
});
