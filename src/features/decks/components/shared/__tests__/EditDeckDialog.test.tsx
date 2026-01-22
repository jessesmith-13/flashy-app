import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EditDeckDialog } from "../EditDeckDialog";

function makeDeck(
  overrides?: Partial<{
    id: string;
    name: string;
    emoji: string;
    color: string;
    category: string;
    subtopic: string;
    difficulty: string;
    frontLanguage: string;
    backLanguage: string;
    cardCount: number;
  }>,
) {
  return {
    id: "deck-1",
    name: "Spanish Basics",
    emoji: "🇪🇸",
    color: "#10b981",
    category: "",
    subtopic: "",
    difficulty: "",
    frontLanguage: "",
    backLanguage: "",
    cardCount: 12,
    ...overrides,
  };
}

describe("EditDeckDialog", () => {
  it("renders when open", () => {
    render(
      <EditDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck()}
        onUpdateDeck={vi.fn(async () => {})}
      />,
    );

    screen.getByText(/edit deck/i);
    screen.getByLabelText(/deck name/i);
    screen.getByRole("button", { name: /update deck/i });
  });

  it("calls onUpdateDeck and closes when submitting", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onUpdateDeck = vi.fn(async () => {});

    render(
      <EditDeckDialog
        open={true}
        onOpenChange={onOpenChange}
        deck={makeDeck({ name: "Old Name" })}
        onUpdateDeck={onUpdateDeck}
      />,
    );

    const input = screen.getByLabelText(/deck name/i) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "New Name");

    const submitBtn = screen.getByRole("button", {
      name: /update deck/i,
    }) as HTMLButtonElement;

    await user.click(submitBtn);

    expect(onUpdateDeck).toHaveBeenCalledTimes(1);

    // Verify the important parts of the payload (matches your component)
    expect(onUpdateDeck).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Name",
        emoji: "🇪🇸",
        color: "#10b981",
        category: undefined,
        subtopic: undefined,
        difficulty: undefined,
        frontLanguage: undefined,
        backLanguage: undefined,
      }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submit button is enabled initially", () => {
    render(
      <EditDeckDialog
        open={true}
        onOpenChange={vi.fn()}
        deck={makeDeck()}
        onUpdateDeck={vi.fn(async () => {})}
      />,
    );

    const btn = screen.getByRole("button", {
      name: /update deck/i,
    }) as HTMLButtonElement;

    expect(btn.disabled).toBe(false);
  });
});
