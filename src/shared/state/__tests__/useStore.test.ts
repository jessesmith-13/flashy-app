import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";

vi.mock("../../api/achievements", () => {
  return {
    fetchUserAchievements: vi.fn().mockResolvedValue({
      unlockedAchievementIds: [],
      customizedDeckTheme: false,
      hasProfilePicture: false,
      decksPublished: 0,
      decksImported: 0,
      studiedBeforeEightAM: false,
      studiedAfterMidnight: false,
      studiedSixtyMinutesNonstop: false,
      studiedThreeHoursInOneDay: false,
      flippedCardFiveTimes: false,
      studiedOnLowBattery: false,
      slowCardReview: false,
      createdMultipleChoiceCard: false,
      createdTrueFalseCard: false,
      createdImageCard: false,
      completedBeginnerDeck: false,
      completedIntermediateDeck: false,
      completedAdvancedDeck: false,
      completedExpertDeck: false,
      completedMasterDeck: false,
      usedAI: false,
      aiCardsGenerated: 0,
      commentsLeft: 0,
      ratingsGiven: 0,
      studiedInDarkMode: false,
    }),
  };
});

import { fetchUserAchievements } from "../../api/achievements";
import { useStore } from "../useStore";
import type { User } from "../../../types/users";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("useStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useStore.getState().logout();
    });
  });

  it("sets authentication data correctly", async () => {
    const user: User = {
      id: "1",
      email: "test@flashy.app",
      name: "Test User",
      subscriptionTier: "free",
    };

    await act(async () => {
      useStore.getState().setAuth(user, "fake_token");
      await flushMicrotasks();
    });

    const state = useStore.getState();
    expect(state.user?.email).toBe("test@flashy.app");
    expect(state.accessToken).toBe("fake_token");

    expect(fetchUserAchievements).toHaveBeenCalledTimes(1);
    expect(fetchUserAchievements).toHaveBeenCalledWith("fake_token");
  });

  it("clears data on logout", () => {
    const user: User = {
      id: "1",
      email: "x@x.com",
      name: "X",
      subscriptionTier: "free",
    };

    act(() => {
      useStore.getState().setAuth(user, "token");
      useStore.getState().logout();
    });

    const state = useStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.decks).toEqual([]);
    expect(state.cards).toEqual([]);
    expect(state.currentView).toBe("landing");
    expect(state.currentSection).toBe("flashcards");
  });

  it("updates current view and section", () => {
    act(() => {
      useStore.getState().setCurrentView("community");
      useStore.getState().setCurrentSection("flashcards");
    });

    const state = useStore.getState();
    expect(state.currentView).toBe("community");
    expect(state.currentSection).toBe("flashcards");
  });
});
