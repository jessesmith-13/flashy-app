import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DecksGrid } from "../DecksGrid";
import type { UIDeck, SortOption } from "../../../../../types/decks";

type DeckCardMockProps = Record<string, unknown> & {
  deck: UIDeck;
  favoritePending: boolean;
  learnedPending: boolean;
  deleting: boolean;
};

type DeckCardMockFn = (props: DeckCardMockProps) => React.ReactElement;

const DeckCardMock = vi.fn<DeckCardMockFn>((props: DeckCardMockProps) => {
  const { deck, favoritePending, learnedPending, deleting } = props;

  return (
    <div data-testid="deck-card">
      <div>{deck.name}</div>
      <div>favoritePending:{String(favoritePending)}</div>
      <div>learnedPending:{String(learnedPending)}</div>
      <div>deleting:{String(deleting)}</div>
    </div>
  );
});

vi.mock("../DeckCard", () => ({
  DeckCard: (props: DeckCardMockProps) => DeckCardMock(props),
}));

function makeDeck(id: string, name: string, userId = "user-1"): UIDeck {
  const now = new Date().toISOString();
  return {
    id,
    name,
    emoji: "📚",
    color: "#10b981",
    userId,
    createdAt: now,
    updatedAt: now,
    isPublic: false,
    isFavorite: false,
    isLearned: false,
    isPublished: false,
    isShared: false,
    isDeleted: false,
    cardCount: 0,
    category: "",
    subtopic: "",
    difficulty: null,
    frontLanguage: "",
    backLanguage: "",
    sourceCommunityDeckId: null,
    communityPublishedId: null,
    communityDeckVersion: null,
    position: 0,
  };
}

describe("DecksGrid", () => {
  it("renders one DeckCard per deck", () => {
    DeckCardMock.mockClear();

    const decks: UIDeck[] = [
      makeDeck("d1", "Deck One"),
      makeDeck("d2", "Deck Two"),
    ];

    render(
      <DecksGrid
        decks={decks}
        sortOption={"custom" as SortOption}
        userId="user-1"
        onDeckClick={vi.fn()}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleLearned={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deletingDeckId={null}
        onOpenPublish={vi.fn()}
        onOpenUnpublish={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    expect(screen.getByText("Deck One")).toBeTruthy();
    expect(screen.getByText("Deck Two")).toBeTruthy();
    expect(DeckCardMock).toHaveBeenCalledTimes(2);
  });

  it("passes favoritePending/learnedPending based on callbacks and deleting based on deletingDeckId", () => {
    DeckCardMock.mockClear();

    const decks: UIDeck[] = [
      makeDeck("d1", "Deck One"),
      makeDeck("d2", "Deck Two"),
    ];

    render(
      <DecksGrid
        decks={decks}
        sortOption={"custom" as SortOption}
        userId="user-1"
        favoritePendingById={(id: string) => id === "d2"}
        learnedPendingById={(id: string) => id === "d1"}
        onDeckClick={vi.fn()}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleLearned={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deletingDeckId={"d1"}
        onOpenPublish={vi.fn()}
        onOpenUnpublish={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    expect(DeckCardMock).toHaveBeenCalledTimes(2);

    const call1Props: DeckCardMockProps = DeckCardMock.mock.calls[0]![0];
    const call2Props: DeckCardMockProps = DeckCardMock.mock.calls[1]![0];

    expect(call1Props.deck.id).toBe("d1");
    expect(call1Props.learnedPending).toBe(true);
    expect(call1Props.favoritePending).toBe(false);
    expect(call1Props.deleting).toBe(true);

    expect(call2Props.deck.id).toBe("d2");
    expect(call2Props.favoritePending).toBe(true);
    expect(call2Props.learnedPending).toBe(false);
    expect(call2Props.deleting).toBe(false);
  });
});
