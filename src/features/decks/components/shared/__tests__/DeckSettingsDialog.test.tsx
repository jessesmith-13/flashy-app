import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckSettingsDialog } from "../DeckSettingsDialog";

describe("DeckSettingsDialog", () => {
  it("renders fields when open", () => {
    render(
      <DeckSettingsDialog
        open={true}
        onOpenChange={vi.fn()}
        name="Spanish Basics"
        emoji="🇪🇸"
        color="emerald"
        category=""
        subtopic=""
        difficulty=""
        frontLanguage="Spanish"
        backLanguage="English"
        onNameChange={vi.fn()}
        onEmojiChange={vi.fn()}
        onColorChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onSubtopicChange={vi.fn()}
        onDifficultyChange={vi.fn()}
        onFrontLanguageChange={vi.fn()}
        onBackLanguageChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // your dialog title is "Edit Deck"
    screen.getByRole("dialog", { name: /edit deck/i });

    // labels from the DOM you pasted
    screen.getByLabelText(/deck name/i);

    // "Choose an Emoji" is a label, not necessarily connected to a form control
    screen.getByText(/choose an emoji/i);
  });

  it("calls onNameChange when typing", async () => {
    const user = userEvent.setup();
    const onNameChange = vi.fn();

    render(
      <DeckSettingsDialog
        open={true}
        onOpenChange={vi.fn()}
        name=""
        emoji="📚"
        color="emerald"
        category=""
        subtopic=""
        difficulty=""
        frontLanguage=""
        backLanguage=""
        onNameChange={onNameChange}
        onEmojiChange={vi.fn()}
        onColorChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onSubtopicChange={vi.fn()}
        onDifficultyChange={vi.fn()}
        onFrontLanguageChange={vi.fn()}
        onBackLanguageChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/deck name/i);
    await user.type(nameInput, "Spanish Basics");

    expect(onNameChange).toHaveBeenCalled();
  });

  it("calls onSubmit when saving", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <DeckSettingsDialog
        open={true}
        onOpenChange={vi.fn()}
        name="Spanish Basics"
        emoji="🇪🇸"
        color="emerald"
        category=""
        subtopic=""
        difficulty=""
        frontLanguage="Spanish"
        backLanguage="English"
        onNameChange={vi.fn()}
        onEmojiChange={vi.fn()}
        onColorChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onSubtopicChange={vi.fn()}
        onDifficultyChange={vi.fn()}
        onFrontLanguageChange={vi.fn()}
        onBackLanguageChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // your button might not literally say "Save". If it does, this works.
    // If not, change /save/i to whatever your button text is.
    const saveBtn = screen.getByRole("button", { name: /save/i });
    await user.click(saveBtn);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
