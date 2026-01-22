import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UnpublishDeckDialog } from "../UnpublishDeckDialog";

function makeDeck(
  overrides?: Partial<{
    id: string;
    name: string;
    emoji: string;
    color: string;
    category: string;
    subtopic: string;
    cardCount: number;
  }>,
) {
  return {
    id: "deck-1",
    name: "Spanish Basics",
    emoji: "🇪🇸",
    color: "#10b981",
    category: "Language",
    subtopic: "Spanish",
    cardCount: 12,
    ...overrides,
  };
}

describe("UnpublishDeckDialog", () => {
  it("renders when open and deck provided", () => {
    render(
      <UnpublishDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck()}
        isLoading={false}
        onConfirm={vi.fn()}
      />,
    );

    screen.getByText(/unpublish from community/i);
    screen.getByText(/remove your deck from the flashy community/i);

    screen.getByText(/spanish basics/i);
    screen.getByText(/12/i);

    screen.getByRole("button", { name: /cancel/i });
    screen.getByRole("button", { name: /^unpublish$/i });
  });

  it("calls onOpenChange(false) when clicking cancel", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <UnpublishDeckDialog
        open={true}
        onOpenChange={onOpenChange}
        deck={makeDeck()}
        isLoading={false}
        onConfirm={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByRole("button", {
      name: /cancel/i,
    }) as HTMLButtonElement;

    await user.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onConfirm when clicking Unpublish", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <UnpublishDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck()}
        isLoading={false}
        onConfirm={onConfirm}
      />,
    );

    const unpublishBtn = screen.getByRole("button", {
      name: /^unpublish$/i,
    }) as HTMLButtonElement;

    await user.click(unpublishBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while loading and shows 'Unpublishing...'", () => {
    render(
      <UnpublishDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck()}
        isLoading={true}
        onConfirm={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByRole("button", {
      name: /cancel/i,
    }) as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);

    const unpublishBtn = screen.getByRole("button", {
      name: /unpublishing/i,
    }) as HTMLButtonElement;
    expect(unpublishBtn.disabled).toBe(true);
  });
});
