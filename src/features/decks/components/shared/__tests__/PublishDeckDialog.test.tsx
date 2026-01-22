import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishDeckDialog } from "../PublishDeckDialog";

function makeDeck(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "deck-1",
    name: "Spanish Basics",
    emoji: "🇪🇸",
    color: "emerald",
    cardCount: 12,
    category: "",
    subtopic: "",
    difficulty: "",
    ...overrides,
  };
}

describe("PublishDeckDialog", () => {
  it("renders when open", () => {
    render(
      <PublishDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck()}
        cardCount={12}
        publishing={false}
        onPublish={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    // unique + stable
    screen.getByRole("dialog", { name: /publish deck to community/i });
    screen.getByText(/share your deck with the community/i);
  });

  it("calls onOpenSettings when clicking Edit Deck Settings", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(
      <PublishDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck({ category: "", subtopic: "" })} // triggers the "set category/subtopic" state you showed
        cardCount={12}
        publishing={false}
        onPublish={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
    );

    const btn = screen.getByRole("button", { name: /edit deck settings/i });
    await user.click(btn);

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("still allows opening settings while publishing", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(
      <PublishDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck({ category: "", subtopic: "" })}
        cardCount={12}
        publishing={true}
        onPublish={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
    );

    const btn = screen.getByRole("button", { name: /edit deck settings/i });
    await user.click(btn);

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
