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

    expect(arg).toMatchObject({
      deck: {
        id: "deck-1",
        name: "Biology 101",
        emoji: "🧬",
        color: "#10B981",
        ownerId: "user-1",
        ownerDisplayName: "Jesse",
        category: "Science",
        subtopic: "Biology",
      },
      cards: [{ id: "c1", front: "Cell", back: "Basic unit of life" }],
    });

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
