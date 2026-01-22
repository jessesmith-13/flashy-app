import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DecksHeader } from "../DecksHeader";

type CreateDeckDialogMockProps = Record<string, unknown> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDeck: (...args: unknown[]) => unknown;
};

type CreateDeckDialogMockFn = (props: CreateDeckDialogMockProps) => null;

const CreateDeckDialogMock = vi.fn<CreateDeckDialogMockFn>(() => null);

vi.mock("../CreateDeckDialog", () => ({
  CreateDeckDialog: (props: CreateDeckDialogMockProps) =>
    CreateDeckDialogMock(props),
}));

describe("DecksHeader", () => {
  it("shows Upgrade button only when isFree=true and calls onUpgrade", async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();

    render(
      <DecksHeader
        isFree={true}
        onUpgrade={onUpgrade}
        onCreateClick={vi.fn()}
        createDialogOpen={false}
        setCreateDialogOpen={vi.fn()}
        onCreateDeck={vi.fn(async () => {})}
      />,
    );

    const upgradeBtn = screen.getByRole("button", { name: /upgrade|pro/i });
    await user.click(upgradeBtn);

    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("does not show Upgrade button when isFree=false", () => {
    render(
      <DecksHeader
        isFree={false}
        onUpgrade={vi.fn()}
        onCreateClick={vi.fn()}
        createDialogOpen={false}
        setCreateDialogOpen={vi.fn()}
        onCreateDeck={vi.fn(async () => {})}
      />,
    );

    expect(screen.queryByRole("button", { name: /upgrade|pro/i })).toBeNull();
  });

  it("calls onCreateClick when Create button clicked", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    render(
      <DecksHeader
        isFree={false}
        onUpgrade={vi.fn()}
        onCreateClick={onCreateClick}
        createDialogOpen={false}
        setCreateDialogOpen={vi.fn()}
        onCreateDeck={vi.fn(async () => {})}
      />,
    );

    await user.click(screen.getByRole("button", { name: /create/i }));
    expect(onCreateClick).toHaveBeenCalledTimes(1);
  });

  it("wires CreateDeckDialog props", () => {
    CreateDeckDialogMock.mockClear();

    const setCreateDialogOpen = vi.fn();
    const onCreateDeck = vi.fn(async () => {});

    render(
      <DecksHeader
        isFree={false}
        onUpgrade={vi.fn()}
        onCreateClick={vi.fn()}
        createDialogOpen={true}
        setCreateDialogOpen={setCreateDialogOpen}
        onCreateDeck={onCreateDeck}
      />,
    );

    expect(CreateDeckDialogMock).toHaveBeenCalledTimes(1);

    const props: CreateDeckDialogMockProps =
      CreateDeckDialogMock.mock.calls[0]![0];

    expect(props.open).toBe(true);
    expect(props.onOpenChange).toBe(setCreateDialogOpen);
    expect(props.onCreateDeck).toBe(onCreateDeck);
  });
});
