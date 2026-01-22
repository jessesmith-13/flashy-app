import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.useFakeTimers();

vi.mock("../../../../shared/api/community", () => ({
  searchCommunityUsers: vi.fn(),
}));

import { searchCommunityUsers } from "../../../../shared/api/community";
const searchCommunityUsersMock = vi.mocked(searchCommunityUsers);

describe("useCommunityUsersSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchCommunityUsersMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("does not search when query length < 2", async () => {
    const { useCommunityUsersSearch } =
      await import("../useCommunityUsersSearch");

    renderHook(({ q }) => useCommunityUsersSearch(q), {
      initialProps: { q: "a" },
    });

    // run debounce window
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(searchCommunityUsersMock).not.toHaveBeenCalled();
  });

  it("debounces and searches when query length >= 2", async () => {
    const { useCommunityUsersSearch } =
      await import("../useCommunityUsersSearch");

    searchCommunityUsersMock.mockResolvedValue([
      { id: "u1", name: "Jesse", deckCount: 3 },
    ]);

    const { result, rerender } = renderHook(
      ({ q }) => useCommunityUsersSearch(q),
      {
        initialProps: { q: "je" },
      },
    );

    // before debounce fires
    expect(searchCommunityUsersMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(310);
    });

    expect(searchCommunityUsersMock).toHaveBeenCalledWith("je");
    expect(result.current.searchedUsers).toEqual([
      { id: "u1", name: "Jesse", deckCount: 3 },
    ]);

    // change query quickly, ensure debounce resets
    rerender({ q: "jes" });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(searchCommunityUsersMock).toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(searchCommunityUsersMock).toHaveBeenCalledTimes(2);
    expect(searchCommunityUsersMock).toHaveBeenLastCalledWith("jes");
  });

  it("returns [] when API throws", async () => {
    const { useCommunityUsersSearch } =
      await import("../useCommunityUsersSearch");

    searchCommunityUsersMock.mockRejectedValueOnce(new Error("nope"));

    const { result } = renderHook(() => useCommunityUsersSearch("je"));

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.searchedUsers).toEqual([]);
  });
});
