import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckHeader } from "../DeckHeader";

function makeDeck(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "deck-1",
    name: "Spanish Basics",
    emoji: "🇪🇸",
    color: "emerald",
    cardCount: 12,
    isPublished: false,
    ...overrides,
  };
}

describe("DeckHeader", () => {
  it("renders deck name + actions we can reliably select", () => {
    render(
      <DeckHeader
        deck={makeDeck()}
        cardCount={12}
        onBack={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onDelete={vi.fn()}
        onStartStudy={vi.fn()}
        onAddCard={vi.fn()}
        onBulkAddCards={vi.fn()}
        onAIGenerate={vi.fn()}
        deleting={false}
        unpublishing={false}
        canPublish={true}
        communityDeckAuthor={null}
        studyCount={0}
        averageScore={undefined}
      />,
    );

    screen.getByRole("heading", { name: /spanish basics/i });

    // These exist in your DOM dump and have real accessible names:
    screen.getByRole("button", { name: /back to decks/i });
    screen.getByRole("button", { name: /add card/i });
    screen.getByRole("button", { name: /bulk add/i });
    screen.getByRole("button", { name: /ai generate/i });
    screen.getByRole("button", { name: /^study$/i });
  });

  it("calls onBack when back button clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <DeckHeader
        deck={makeDeck()}
        cardCount={12}
        onBack={onBack}
        onOpenSettings={vi.fn()}
        onOpenPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onDelete={vi.fn()}
        onStartStudy={vi.fn()}
        onAddCard={vi.fn()}
        onBulkAddCards={vi.fn()}
        onAIGenerate={vi.fn()}
        deleting={false}
        unpublishing={false}
        canPublish={true}
        communityDeckAuthor={null}
        studyCount={0}
        averageScore={undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: /back to decks/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls onStartStudy when Study clicked", async () => {
    const user = userEvent.setup();
    const onStartStudy = vi.fn();

    render(
      <DeckHeader
        deck={makeDeck()}
        cardCount={12}
        onBack={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onDelete={vi.fn()}
        onStartStudy={onStartStudy}
        onAddCard={vi.fn()}
        onBulkAddCards={vi.fn()}
        onAIGenerate={vi.fn()}
        deleting={false}
        unpublishing={false}
        canPublish={true}
        communityDeckAuthor={null}
        studyCount={0}
        averageScore={undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^study$/i }));
    expect(onStartStudy).toHaveBeenCalledTimes(1);
  });

  // NOTE: publish/unpublish/settings are icon-only buttons (name=""),
  // so you can't reliably click them by name unless the component adds aria-labels.
});
