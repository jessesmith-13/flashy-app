import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommunityStudyNavigation } from "../useCommunityStudyNavigation";
import type { UICommunityDeck } from "../../../../types/community";

// --- mocks ---
const mockSetTemporaryStudyDeck = vi.fn();
const mockSetReturnToCommunityDeck = vi.fn();
const mockNavigateTo = vi.fn();

vi.mock("@/shared/state/useStore", () => ({
  useStore: () => ({
    setTemporaryStudyDeck: mockSetTemporaryStudyDeck,
    setReturnToCommunityDeck: mockSetReturnToCommunityDeck,
  }),
}));

vi.mock("@/shared/hooks/useNavigation", () => ({
  useNavigation: () => ({
    navigateTo: mockNavigateTo,
  }),
}));

describe("useCommunityStudyNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets temporary study deck, sets return deck, then navigates to study", () => {
    const deck = {
      id: "deck-1",
      name: "Biology 101",
      ownerId: "user-1",
      ownerDisplayName: "Jesse",
      emoji: "🧬",
      color: "#10B981",
      category: "Science",
      subtopic: "Biology",
      cards: [{ id: "c1", front: "Cell", back: "Basic unit of life" }],
      downloadCount: 5,
      publishedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    } as unknown as UICommunityDeck;

    const { result } = renderHook(() => useCommunityStudyNavigation());

    act(() => {
      result.current.studyCommunityDeck(deck);
    });

    expect(mockSetTemporaryStudyDeck).toHaveBeenCalledTimes(1);
    const arg = mockSetTemporaryStudyDeck.mock.calls[0][0];

    // ✅ Only assert what matters + what mapper guarantees
    expect(arg).toEqual(
      expect.objectContaining({
        deck: expect.objectContaining({
          id: "deck-1",
          name: "Biology 101",
          emoji: "🧬",
          color: "#10B981",
          category: "Science",
          subtopic: "Biology",

          // ✅ this is what your mapper actually sets
          userId: "user-1",
          sourceCommunityDeckId: "deck-1",

          cardCount: 1,

          // defaults your mapper adds (don’t assert exact unless you want to)
          difficulty: "beginner",
          isPublic: true,
          isPublished: true,
          isDeleted: false,

          frontLanguage: null,
          backLanguage: null,

          communityPublishedId: null,
          importedFromVersion: null,
          lastSyncedAt: null,

          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: expect.any(String), // dynamic timestamp
        }),

        cards: expect.arrayContaining([
          expect.objectContaining({
            id: "c1",
            front: "Cell",
            back: "Basic unit of life",
          }),
        ]),
      }),
    );

    expect(mockSetReturnToCommunityDeck).toHaveBeenCalledWith(deck);
    expect(mockNavigateTo).toHaveBeenCalledWith("study");
  });

  it("fills safe defaults when optional fields are missing", () => {
    const deck = {
      id: "deck-2",
      name: "No Emoji Deck",
      ownerId: "user-2",
      cards: [],
    } as unknown as UICommunityDeck;

    const { result } = renderHook(() => useCommunityStudyNavigation());

    act(() => {
      result.current.studyCommunityDeck(deck);
    });

    const arg = mockSetTemporaryStudyDeck.mock.calls[0][0];
    expect(arg.deck.emoji).toBe("📚");
    expect(arg.deck.color).toBe("#10B981");
    expect(arg.cards).toEqual([]);
  });
});
