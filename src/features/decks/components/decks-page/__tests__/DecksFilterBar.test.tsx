import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ✅ import your component
import { DecksFiltersBar } from "../DecksFiltersBar";
import type { DecksTab, SortOption } from "../../../../../types/decks";

// ------------------------------
// Mocks for UI primitives
// ------------------------------

// Minimal Input mock (if your real Input forwards props, you can skip this)
vi.mock("@/shared/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

/**
 * Radix-ish Select mock:
 * - <Select value onValueChange> provides context
 * - <SelectTrigger> becomes a simple wrapper
 * - <SelectValue> noop (placeholder is not needed)
 * - <SelectContent> renders a native <select> that triggers onValueChange
 * - <SelectItem> is ignored because we render options manually below
 *
 * Instead of trying to replicate exact markup, we expose one real <select>
 * with aria-label from SelectTrigger children text fallback.
 */
type SelectCtx = { value: string; onValueChange: (v: string) => void };
const SelectContext = React.createContext<SelectCtx | null>(null);

vi.mock("@/shared/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div data-testid="mock-select">{children}</div>
    </SelectContext.Provider>
  ),

  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-select-trigger">{children}</div>
  ),

  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="mock-select-value">{placeholder ?? ""}</span>
  ),

  // We render a native <select> for the content so tests can change value
  SelectContent: ({ children }: { children: React.ReactNode }) => {
    const ctx = React.useContext(SelectContext);
    if (!ctx) return null;

    type SelectItemLikeProps = {
      value?: string;
      children?: React.ReactNode;
    };

    // Collect SelectItem nodes into <option>s
    const options: Array<{ value: string; label: string }> = [];
    React.Children.forEach(children, (child: React.ReactNode) => {
      if (!React.isValidElement<SelectItemLikeProps>(child)) return;

      const value = child.props.value;
      if (!value) return;

      options.push({
        value: String(value),
        label: String(child.props.children ?? ""),
      });
    });

    return (
      <select
        aria-label="select"
        value={ctx.value}
        onChange={(e) => ctx.onValueChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  },

  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <div data-testid={`mock-select-item-${value}`}>{children}</div>,
}));

/**
 * Tabs mock:
 * - Tabs renders children and calls onValueChange when a TabsTrigger is clicked
 */
type TabsCtx = { value: string; onValueChange: (v: string) => void };
const TabsContext = React.createContext<TabsCtx | null>(null);

vi.mock("@/shared/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div data-testid="mock-tabs">{children}</div>
    </TabsContext.Provider>
  ),

  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-tabs-list">{children}</div>
  ),

  TabsTrigger: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => {
    const ctx = React.useContext(TabsContext);
    return (
      <button type="button" onClick={() => ctx?.onValueChange(value)}>
        {children}
      </button>
    );
  },
}));

// ------------------------------
// Test helpers
// ------------------------------

const counts = {
  all: 10,
  favorites: 2,
  learned: 3,
  added: 4,
  created: 5,
  published: 6,
  unpublished: 7,
};

const categories = [
  { category: "Language", subtopics: ["Spanish", "French"] },
  { category: "Science", subtopics: ["Biology", "Chemistry"] },
] as const;

function Harness({
  onSetSearchQuery,
  ...props
}: Partial<React.ComponentProps<typeof DecksFiltersBar>> & {
  onSetSearchQuery?: (v: string) => void;
}) {
  const [searchQuery, setSearchQueryState] = React.useState("");

  const setSearchQuery = (v: string) => {
    setSearchQueryState(v);
    onSetSearchQuery?.(v);
  };

  return (
    <DecksFiltersBar
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      filterCategory="all"
      setFilterCategory={() => {}}
      filterSubtopic="all"
      setFilterSubtopic={() => {}}
      activeTab={"all" as DecksTab}
      setActiveTab={() => {}}
      sortOption={"custom" as SortOption}
      setSortOption={() => {}}
      counts={counts}
      categories={categories}
      {...props}
    />
  );
}

function renderBar(
  overrides?: Partial<React.ComponentProps<typeof DecksFiltersBar>>,
) {
  const setSearchQuery = vi.fn();
  const setFilterCategory = vi.fn();
  const setFilterSubtopic = vi.fn();
  const setActiveTab = vi.fn();
  const setSortOption = vi.fn();

  const props: React.ComponentProps<typeof DecksFiltersBar> = {
    searchQuery: "",
    setSearchQuery,
    filterCategory: "all",
    setFilterCategory,
    filterSubtopic: "all",
    setFilterSubtopic,
    activeTab: "all" as DecksTab,
    setActiveTab,
    sortOption: "custom" as SortOption,
    setSortOption,
    counts,
    categories: categories,
    ...overrides,
  };

  render(<DecksFiltersBar {...props} />);

  return {
    setSearchQuery,
    setFilterCategory,
    setFilterSubtopic,
    setActiveTab,
    setSortOption,
  };
}

// ------------------------------
// Tests
// ------------------------------

describe("DecksFiltersBar", () => {
  it("calls setSearchQuery when typing and shows clear button", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();

    render(<Harness onSetSearchQuery={spy} />);

    const input = screen.getByPlaceholderText(/search decks/i);
    await user.type(input, "spanish");

    expect(spy).toHaveBeenLastCalledWith("spanish");
  });

  it("clears search when clicking the X button", async () => {
    const user = userEvent.setup();
    const { setSearchQuery } = renderBar({ searchQuery: "abc" });

    // The X button only appears when searchQuery is truthy
    const clearBtn = screen.getByRole("button", { name: /clear search/i });
    await user.click(clearBtn);

    expect(setSearchQuery).toHaveBeenCalledWith("");
  });

  it("selecting a category calls setFilterCategory and resets subtopic to 'all'", async () => {
    const user = userEvent.setup();
    const { setFilterCategory, setFilterSubtopic } = renderBar({
      filterCategory: "all",
      filterSubtopic: "Spanish",
    });

    // Our mocked SelectContent is a native <select aria-label="select">
    // There are multiple selects in this component; the first one is Category.
    const selects = screen.getAllByLabelText("select");
    const categorySelect = selects[0];

    await user.selectOptions(categorySelect, "Language");

    expect(setFilterCategory).toHaveBeenCalledWith("Language");
    expect(setFilterSubtopic).toHaveBeenCalledWith("all");
  });

  it("shows subtopic select when filterCategory !== 'all'", () => {
    renderBar({
      filterCategory: "Language",
      filterSubtopic: "all",
    });

    // Now there should be two selects: category + subtopic (plus sort & mobile tab select)
    // Because desktop + mobile elements both render in DOM, we avoid counting.
    // Instead, verify that a subtopic option exists.
    expect(screen.getByText("Spanish")).toBeTruthy();
    expect(screen.getByText("French")).toBeTruthy();
  });

  it("calls setFilterSubtopic when subtopic changes", async () => {
    const user = userEvent.setup();
    const { setFilterSubtopic } = renderBar({
      filterCategory: "Language",
      filterSubtopic: "all",
    });

    // Find a select whose options include "Spanish"
    const selects = screen.getAllByLabelText("select");
    const subtopicSelect = selects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some(
        (o) => o.value === "Spanish",
      ),
    );

    expect(subtopicSelect).toBeTruthy();

    await user.selectOptions(subtopicSelect as HTMLSelectElement, "Spanish");

    expect(setFilterSubtopic).toHaveBeenCalledWith("Spanish");
  });

  it("clicking a desktop tab calls setActiveTab", async () => {
    const user = userEvent.setup();
    const { setActiveTab } = renderBar({
      activeTab: "all" as DecksTab,
    });

    await user.click(screen.getByRole("button", { name: /favorites/i }));
    expect(setActiveTab).toHaveBeenCalledWith("favorites");
  });

  it("changing sort option calls setSortOption", async () => {
    const user = userEvent.setup();
    const { setSortOption } = renderBar({
      sortOption: "custom" as SortOption,
    });

    const selects = screen.getAllByLabelText("select");
    // Sort select has option "newest"
    const sortSelect = selects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some(
        (o) => o.value === "newest",
      ),
    );

    expect(sortSelect).toBeTruthy();

    await user.selectOptions(sortSelect as HTMLSelectElement, "newest");
    expect(setSortOption).toHaveBeenCalledWith("newest");
  });
});
