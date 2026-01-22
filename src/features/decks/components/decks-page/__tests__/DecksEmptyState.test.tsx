import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DecksEmptyState } from "../DecksEmptyState";
import type { DecksTab } from "../../../../../types/decks";

describe("DecksEmptyState", () => {
  it("shows filter empty state when has filters", () => {
    const activeTab: DecksTab = "all";

    render(
      <DecksEmptyState
        activeTab={activeTab}
        searchQuery="spanish"
        filterCategory="all"
        filterSubtopic="all"
        onClearFilters={vi.fn()}
      />,
    );

    screen.getByText(/no decks found/i);
    screen.getByText(/try adjusting/i);
  });

  it("shows Clear Filters button when category/subtopic filtered", () => {
    const activeTab: DecksTab = "all";

    render(
      <DecksEmptyState
        activeTab={activeTab}
        searchQuery=""
        filterCategory="Languages"
        filterSubtopic="all"
        onClearFilters={vi.fn()}
      />,
    );

    screen.getByRole("button", { name: /clear filters/i });
  });

  it("calls onClearFilters when clicking Clear Filters", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    const activeTab: DecksTab = "all";

    render(
      <DecksEmptyState
        activeTab={activeTab}
        searchQuery=""
        filterCategory="Languages"
        filterSubtopic="all"
        onClearFilters={onClearFilters}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /clear filters/i,
      }) as HTMLButtonElement,
    );

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("shows the correct title for favorites tab when no filters", () => {
    const activeTab: DecksTab = "favorites";

    render(
      <DecksEmptyState
        activeTab={activeTab}
        searchQuery=""
        filterCategory="all"
        filterSubtopic="all"
        onClearFilters={vi.fn()}
      />,
    );

    screen.getByText(/no favorite decks yet/i);
  });
});
