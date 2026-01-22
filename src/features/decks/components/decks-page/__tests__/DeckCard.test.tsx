import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeckCard } from "../DeckCard";
import type { UIDeck, SortOption } from "../../../../../types/decks";

const nowIso = () => new Date().toISOString();

export function makeDeck(overrides: Partial<UIDeck> = {}): UIDeck {
  return {
    id: "deck-1",
    name: "Spanish Basics",
    emoji: "🇪🇸",
    color: "#10b981",

    userId: "user-1",

    // required timestamps
    createdAt: nowIso(),
    updatedAt: nowIso(),

    // required flags (adjust defaults to match your real model)
    isPublic: false,
    isFavorite: false,
    isLearned: false,
    isPublished: false,
    isShared: false,
    isDeleted: false,

    // fields your UI reads in DeckCard/Dialogs
    cardCount: 12,
    category: "",
    subtopic: "",
    difficulty: null, // <-- IMPORTANT: no default difficulty
    frontLanguage: "",
    backLanguage: "",

    // whatever your model expects for “community”
    sourceCommunityDeckId: null,
    communityPublishedId: null,
    communityDeckVersion: null,

    // optional common fields (only include if your UIDeck requires them)
    position: 0,

    ...overrides,
  };
}

describe("DeckCard", () => {
  it("navigates when deck is clicked", async () => {
    const user = userEvent.setup();
    const onDeckClick = vi.fn();

    const sortOption: SortOption = "custom"; // choose any valid SortOption value

    render(
      <DeckCard
        deck={makeDeck()}
        sortOption={sortOption}
        userId="owner-1"
        onDeckClick={onDeckClick}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleLearned={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deleting={false}
        onOpenPublish={vi.fn()}
        onOpenUnpublish={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    await user.click(screen.getByText(/spanish basics/i));
    expect(onDeckClick).toHaveBeenCalledWith("deck-1");
  });

  it("toggles favorite without navigating", async () => {
    const user = userEvent.setup();
    const onDeckClick = vi.fn();
    const onToggleFavorite = vi.fn();

    const sortOption: SortOption = "custom";

    render(
      <DeckCard
        deck={makeDeck()}
        sortOption={sortOption}
        userId="user-1"
        onDeckClick={onDeckClick}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onToggleFavorite={onToggleFavorite}
        onToggleLearned={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deleting={false}
        onOpenPublish={vi.fn()}
        onOpenUnpublish={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    const favBtn = screen.getByTitle("Favorite") as HTMLButtonElement;
    await user.click(favBtn);

    expect(onToggleFavorite).toHaveBeenCalledWith("deck-1");
    expect(onDeckClick).toHaveBeenCalledTimes(0);
  });

  it("shows publish button for owner when not published and not from community", () => {
    const sortOption: SortOption = "custom";

    render(
      <DeckCard
        deck={makeDeck({ isPublished: false, sourceCommunityDeckId: null })}
        sortOption={sortOption}
        userId="user-1"
        onDeckClick={vi.fn()}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleLearned={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deleting={false}
        onOpenPublish={vi.fn()}
        onOpenUnpublish={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Publish to Community")).toBeTruthy();
  });

  it("shows unpublish button for owner when published", () => {
    const sortOption: SortOption = "custom";

    render(
      <DeckCard
        deck={makeDeck({ isPublished: true })}
        sortOption={sortOption}
        userId="user-1"
        onDeckClick={vi.fn()}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleLearned={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deleting={false}
        onOpenPublish={vi.fn()}
        onOpenUnpublish={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Unpublish from Community")).toBeTruthy();
  });

  it("does not show publish/unpublish actions for non-owner", () => {
    const sortOption: SortOption = "custom";

    render(
      <DeckCard
        deck={makeDeck({ userId: "owner-1", isPublished: true })}
        sortOption={sortOption}
        userId="someone-else"
        onDeckClick={vi.fn()}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleLearned={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deleting={false}
        onOpenPublish={vi.fn()}
        onOpenUnpublish={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    expect(screen.queryByTitle("Publish to Community")).toBeNull();
    expect(screen.queryByTitle("Unpublish from Community")).toBeNull();
  });
});
