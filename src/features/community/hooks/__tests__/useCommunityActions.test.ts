// useCommunityActions.test.tsx
// Vitest + @testing-library/react (RTL v14+) renderHook
// If you're on older RTL, swap to @testing-library/react-hooks.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useCommunityActions } from "../useCommunityActions";
import type { UIDeck } from "../../../../types/decks";
import type { UICommunityDeck } from "../../../../types/community";

// -----------------------------
// Mocks
// -----------------------------
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/shared/auth/roles", () => ({
  useIsSuperuser: vi.fn(),
}));

vi.mock("@/shared/state/useStore", () => ({
  useStore: vi.fn(),
}));

vi.mock("@/shared/entitlements/subscription", () => ({
  canImportCommunityDecks: vi.fn(),
}));

vi.mock("@/shared/api/community", () => ({
  addDeckFromCommunity: vi.fn(),
  getCommunityDeck: vi.fn(),
  publishDeck: vi.fn(),
  unpublishDeck: vi.fn(),
}));

vi.mock("@/shared/api/decks", () => ({
  updateImportedDeck: vi.fn(),
  fetchDecks: vi.fn(),
}));

vi.mock("@/shared/api/admin", () => ({
  deleteCommunityDeck: vi.fn(),
  deleteCommunityCard: vi.fn(),
  toggleCommunityDeckFeatured: vi.fn(),
}));

// -----------------------------
// Imports after mocks
// -----------------------------
import { toast } from "sonner";
import { useIsSuperuser } from "../../../../shared/auth/roles";
import { useStore } from "../../../../shared/state/useStore";
import { canImportCommunityDecks } from "../../../../shared/entitlements/subscription";
import {
  addDeckFromCommunity,
  getCommunityDeck,
  publishDeck,
  unpublishDeck,
} from "../../../../shared/api/community";
import { updateImportedDeck, fetchDecks } from "../../../../shared/api/decks";
import {
  deleteCommunityDeck,
  deleteCommunityCard,
  toggleCommunityDeckFeatured,
} from "../../../../shared/api/admin";

// -----------------------------
// Minimal fixtures (typed loosely on purpose)
// -----------------------------

const makeCommunityDeck = (
  overrides: Partial<UICommunityDeck> = {},
): UICommunityDeck => {
  const now = new Date().toISOString();

  type UICommunityCardT = NonNullable<UICommunityDeck["cards"]>[number];

  const baseCard = {
    id: "card_1",
    communityDeckId: "comm_1",

    front: "Q1",
    back: "A1",
    cardType: "classic-flip",

    // If UI type is `string[] | undefined`
    correctAnswers: null,
    incorrectAnswers: null,
    acceptedAnswers: null,

    audioUrl: null, // keep null only if the UI type allows null
    frontImageUrl: null,
    backImageUrl: null,
    frontAudio: null,
    backAudio: null,

    favorite: false,
    isIgnored: false,
    isFlagged: false,
    isDeleted: false,

    position: 0,
    createdAt: now,
    updatedAt: now,

    // deletion audit fields — only keep these if the UI type *actually* includes them
    deletedAt: null,
    deletedReason: null,
    deletedBy: null,
    deletedByName: null,
  } satisfies UICommunityCardT;

  const base: UICommunityDeck = {
    id: "comm_1",
    name: "Biology Basics",
    description: null,

    ownerId: "owner_1",
    ownerDisplayName: "Owner",
    ownerName: "owner",
    ownerAvatar: null,
    sourceContentUpdatedAt: null,
    difficulty: "beginner",

    emoji: "📚",
    color: "#10B981",

    category: "Science",
    subtopic: "Biology",

    cards: [baseCard],
    cardCount: 12,

    version: 1,
    featured: false,
    downloadCount: 0,
    originalDeckId: "orig_1",

    importCount: 0,
    isFlagged: false,
    isPublished: true,
    isDeleted: false,

    createdAt: now,
    updatedAt: now,
    publishedAt: now,

    averageRating: 0,
    ratingCount: 0,

    frontLanguage: null,
    backLanguage: null,
  };

  const merged = { ...base, ...overrides } as UICommunityDeck;

  // keep strict fields from ever being undefined
  if (merged.description === undefined) merged.description = null;
  if (merged.cards?.[0]?.communityDeckId === undefined) {
    // (paranoia) ensure card link exists
    merged.cards = merged.cards?.map((c) => ({
      ...c,
      communityDeckId: merged.id,
    }));
  }

  return merged;
};

const makeUserDeck = (overrides: Partial<UIDeck> = {}) =>
  ({
    id: "deck_1",
    name: "My Deck",
    emoji: "📚",
    color: "#10B981",
    cardCount: 12,
    category: "Science",
    subtopic: "Biology",
    sourceCommunityDeckId: null,
    communityPublishedId: null,
    importedFromVersion: 1,
    isDeleted: false,
    isPublished: false,
    updatedAt: new Date("2025-01-01").toISOString(),
    lastSyncedAt: new Date("2025-01-01").toISOString(),
    ...overrides,
  }) as UIDeck;

// Store mock helper
type StoreFixture = {
  user: { id: string; subscriptionTier: string } | null;
  accessToken: string | null;
  decks: UIDeck[];
  updateDeck: ReturnType<typeof vi.fn>;
  setDecks: ReturnType<typeof vi.fn>;
  addDeck: ReturnType<typeof vi.fn>;
  setReturnToCommunityDeck: ReturnType<typeof vi.fn>;
};

const useStoreMock = vi.mocked(useStore);

const setupStore = (overrides: Partial<StoreFixture> = {}) => {
  const state: StoreFixture = {
    user: { id: "user_1", subscriptionTier: "free" },
    accessToken: "token",
    decks: [makeUserDeck()],
    updateDeck: vi.fn(),
    setDecks: vi.fn(),
    addDeck: vi.fn(),
    setReturnToCommunityDeck: vi.fn(),
    ...overrides,
  };

  useStoreMock.mockReturnValue(state);
  return state;
};

// Hook helper
const setupHook = (
  opts?: Partial<Parameters<typeof useCommunityActions>[0]>,
) => {
  const base = {
    loadCommunityDecks: vi.fn().mockResolvedValue(undefined),
    communityDecks: [makeCommunityDeck()],
    setUpgradeModalOpen: vi.fn(),
    setUpgradeFeature: vi.fn(),
    setViewingDeck: vi.fn(),
    viewingDeck: makeCommunityDeck(),
  };

  const rendered = renderHook(() =>
    useCommunityActions({ ...base, ...(opts ?? {}) }),
  );

  return { ...rendered, base: { ...base, ...(opts ?? {}) } };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useIsSuperuser).mockReturnValue(false);
  vi.mocked(canImportCommunityDecks).mockReturnValue(true);
});

// -----------------------------
// Tests
// -----------------------------
describe("useCommunityActions", () => {
  it("openFlagDialog opens dialog and records flagged decks/cards", () => {
    setupStore();
    const { result } = setupHook();

    act(() => {
      result.current.openFlagDialog("deck", "comm_1", "Deck Name");
    });

    expect(result.current.flagDialogOpen).toBe(true);
    expect(result.current.flagItemType).toBe("deck");
    expect(result.current.flagItemId).toBe("comm_1");
    expect(result.current.flagItemName).toBe("Deck Name");
    expect(result.current.flaggedDecks.has("comm_1")).toBe(true);

    act(() => {
      result.current.openFlagDialog("card", "card_99", "Card Name", "comm_1");
    });

    expect(result.current.flagItemType).toBe("card");
    expect(result.current.flagItemDetails).toEqual({ deckId: "comm_1" });
    expect(result.current.flaggedCards.has("card_99")).toBe(true);
  });

  it("performUpdate: no token => toast.error + no API call", async () => {
    setupStore({ accessToken: null });
    const { result } = setupHook();

    await act(async () => {
      await result.current.performUpdate(makeCommunityDeck(), makeUserDeck());
    });

    expect(toast.error).toHaveBeenCalledWith(
      "You must be logged in to update decks",
    );
    expect(updateImportedDeck).not.toHaveBeenCalled();
  });

  it("performUpdate: calls updateImportedDeck + updateDeck and toasts success", async () => {
    const store = setupStore({ accessToken: "token" });
    (
      updateImportedDeck as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "deck_imported",
      name: "Updated Deck",
    });

    const { result } = setupHook();

    await act(async () => {
      await result.current.performUpdate(
        makeCommunityDeck({ name: "Community v2" }),
        makeUserDeck({ id: "deck_imported" }),
      );
    });

    expect(updateImportedDeck).toHaveBeenCalledWith(
      "token",
      "deck_imported",
      expect.objectContaining({
        name: "Community v2",
        version: 1,
      }),
    );
    expect(store.updateDeck).toHaveBeenCalledWith("deck_imported", {
      id: "deck_imported",
      name: "Updated Deck",
    });
    expect(toast.success).toHaveBeenCalledWith("Community v2 updated!");
  });

  it("handleUpdateDeck: if user has edits -> sets pendingUpdate + opens warning", async () => {
    setupStore({ accessToken: "token" });
    const { result } = setupHook();

    const importedDeck = makeUserDeck({
      id: "deck_imported",
      updatedAt: new Date("2025-02-01T00:00:00.000Z").toISOString(), // user edited
      lastSyncedAt: new Date("2025-01-01T00:00:00.000Z").toISOString(),
      isDeleted: false,
    });

    const communityDeck = makeCommunityDeck({
      id: "comm_1",
      // whatever fields; handleUpdateDeck doesn't use timestamps for update availability
    });

    const fullDeck = makeCommunityDeck({
      id: "comm_1",
      name: "FULL FROM API",
    });

    (getCommunityDeck as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      fullDeck,
    );

    await act(async () => {
      await result.current.handleUpdateDeck(communityDeck, importedDeck);
    });

    expect(result.current.updateWarningOpen).toBe(true);
    expect(result.current.pendingUpdate).toEqual({
      communityDeck: fullDeck, // ✅ IMPORTANT: uses fetched deck
      importedDeck,
    });

    expect(updateImportedDeck).not.toHaveBeenCalled();
  });

  it("handleAddDeck: entitlement fail -> opens upgrade modal and returns", async () => {
    setupStore({
      user: { id: "user_1", subscriptionTier: "free" },
      accessToken: "token",
    });

    (
      canImportCommunityDecks as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(false);

    const setUpgradeModalOpen = vi.fn();
    const setUpgradeFeature = vi.fn();

    const { result } = setupHook({
      setUpgradeModalOpen,
      setUpgradeFeature,
      viewingDeck: null,
      setViewingDeck: undefined,
    });

    await act(async () => {
      await result.current.handleAddDeck(makeCommunityDeck());
    });

    expect(setUpgradeFeature).toHaveBeenCalledWith("importing Community decks");
    expect(setUpgradeModalOpen).toHaveBeenCalledWith(true);
    expect(addDeckFromCommunity).not.toHaveBeenCalled();
  });

  it("handleAddDeck: non-owner duplicate import -> toast.info and no API call", async () => {
    setupStore({
      user: { id: "user_1", subscriptionTier: "pro" },
      accessToken: "token",
      decks: [
        makeUserDeck({
          id: "existing",
          sourceCommunityDeckId: "comm_1",
          isDeleted: false,
        }),
      ],
    });

    const { result } = setupHook({
      communityDecks: [makeCommunityDeck({ ownerId: "someone_else" })],
    });

    await act(async () => {
      await result.current.handleAddDeck(
        makeCommunityDeck({ ownerId: "someone_else" }),
      );
    });

    expect(toast.info).toHaveBeenCalledWith(
      "You have already added this deck to your collection",
    );
    expect(addDeckFromCommunity).not.toHaveBeenCalled();
  });

  it("handleAddDeck: success -> adds deck, reloads community, increments viewing downloadCount", async () => {
    const store = setupStore({
      user: { id: "user_1", subscriptionTier: "pro" },
      accessToken: "token",
      decks: [makeUserDeck()],
      addDeck: vi.fn(), // ✅ make sure your store fixture includes this
    });

    const returnedDeck = makeUserDeck({
      id: "after",
      sourceCommunityDeckId: "comm_1",
      isDeleted: false,
    });

    (
      addDeckFromCommunity as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue(returnedDeck);

    const loadCommunityDecks = vi.fn().mockResolvedValue(undefined);
    const setViewingDeck = vi.fn();

    const viewingDeck = makeCommunityDeck({ id: "comm_1", downloadCount: 5 });

    const { result } = setupHook({
      loadCommunityDecks,
      viewingDeck,
      setViewingDeck,
    });

    await act(async () => {
      await result.current.handleAddDeck(viewingDeck);
    });

    expect(addDeckFromCommunity).toHaveBeenCalledTimes(1);
    expect(fetchDecks).toHaveBeenCalledTimes(0);

    // ✅ now it should be called with the returned deck object
    expect(store.addDeck).toHaveBeenCalledWith(
      expect.objectContaining({ id: "after" }),
    );

    expect(loadCommunityDecks).not.toHaveBeenCalled(); // (your hook doesn’t call it in handleAddDeck)
    expect(setViewingDeck).toHaveBeenCalledWith(
      expect.objectContaining({ downloadCount: 6 }),
    );
  });

  it("handleToggleFeatured: requires superuser", async () => {
    setupStore({ accessToken: "token" });
    (useIsSuperuser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    );

    const { result } = setupHook();

    await act(async () => {
      await result.current.handleToggleFeatured("comm_1");
    });

    expect(toast.error).toHaveBeenCalledWith("Unauthorized");
    expect(toggleCommunityDeckFeatured).not.toHaveBeenCalled();
  });

  it("handleToggleFeatured: toggles + updates viewing deck when matching", async () => {
    setupStore({ accessToken: "token" });
    (useIsSuperuser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );

    const loadCommunityDecks = vi.fn().mockResolvedValue(undefined);
    const setViewingDeck = vi.fn();

    const updated = makeCommunityDeck({ id: "comm_1", featured: true });

    (
      toggleCommunityDeckFeatured as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ deck: updated });

    const { result } = setupHook({
      loadCommunityDecks,
      viewingDeck: makeCommunityDeck({ id: "comm_1" }),
      setViewingDeck,
    });

    await act(async () => {
      await result.current.handleToggleFeatured("comm_1");
    });

    expect(toggleCommunityDeckFeatured).toHaveBeenCalledWith("token", "comm_1");
    expect(loadCommunityDecks).toHaveBeenCalled();
    expect(setViewingDeck).toHaveBeenCalledWith(updated);
    expect(toast.success).toHaveBeenCalledWith("Deck featured status updated");
  });

  it("handleDeleteCommunityDeck: opens dialog and sets payload", () => {
    setupStore({ accessToken: "token" });
    (useIsSuperuser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );

    const { result } = setupHook();

    act(() => {
      result.current.handleDeleteCommunityDeck("comm_1", "Bad Deck");
    });

    expect(result.current.deleteDeckDialogOpen).toBe(true);
    expect(result.current.deckToDelete).toEqual({
      id: "comm_1",
      name: "Bad Deck",
    });
  });

  it("confirmDeleteDeck: deletes, refreshes, clears viewing + returnToCommunityDeck, closes dialog", async () => {
    const store = setupStore({ accessToken: "token" });
    (useIsSuperuser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );

    (
      deleteCommunityDeck as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);

    const loadCommunityDecks = vi.fn().mockResolvedValue(undefined);
    const setViewingDeck = vi.fn();

    const { result } = setupHook({
      loadCommunityDecks,
      viewingDeck: makeCommunityDeck({ id: "comm_1" }),
      setViewingDeck,
    });

    act(() => {
      result.current.handleDeleteCommunityDeck("comm_1", "Bad Deck");
    });

    await act(async () => {
      await result.current.confirmDeleteDeck("spam");
    });

    expect(deleteCommunityDeck).toHaveBeenCalledWith("token", "comm_1", "spam");
    expect(loadCommunityDecks).toHaveBeenCalled();
    expect(setViewingDeck).toHaveBeenCalledWith(null);
    expect(store.setReturnToCommunityDeck).toHaveBeenCalledWith(null);
    expect(result.current.deleteDeckDialogOpen).toBe(false);
    expect(result.current.deckToDelete).toBe(null);
  });

  it("handleDeleteCard + confirmDeleteCard: deletes and refreshes viewing deck", async () => {
    setupStore({ accessToken: "token" });
    (useIsSuperuser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );

    (
      deleteCommunityCard as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);

    const loadCommunityDecks = vi.fn().mockResolvedValue(undefined);
    const setViewingDeck = vi.fn();
    (getCommunityDeck as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeCommunityDeck({ id: "comm_1", name: "After Delete" }),
    );

    const { result } = setupHook({
      loadCommunityDecks,
      viewingDeck: makeCommunityDeck({ id: "comm_1" }),
      setViewingDeck,
    });

    act(() => {
      result.current.handleDeleteCard("card_1", "Card", "comm_1");
    });

    await act(async () => {
      await result.current.confirmDeleteCard("policy");
    });

    expect(deleteCommunityCard).toHaveBeenCalledWith(
      "token",
      "comm_1",
      "card_1",
      "policy",
    );

    expect(loadCommunityDecks).toHaveBeenCalled();
    expect(getCommunityDeck).toHaveBeenCalledWith("comm_1");
    expect(setViewingDeck).toHaveBeenCalledWith(
      expect.objectContaining({ name: "After Delete" }),
    );

    expect(result.current.deleteCardDialogOpen).toBe(false);
    expect(result.current.cardToDelete).toBe(null);
  });

  it("handleUnpublishDeck opens unpublish dialog for deck in list", async () => {
    setupStore({ accessToken: "token" });
    const deck = makeCommunityDeck({ id: "comm_1", originalDeckId: "orig_1" });

    const { result } = setupHook({ communityDecks: [deck] });

    await act(async () => {
      await result.current.handleUnpublishDeck("comm_1");
    });

    expect(result.current.unpublishDialogOpen).toBe(true);
    expect(result.current.unpublishingDeck?.id).toBe("comm_1");
  });

  it("confirmUnpublish requires originalDeckId", async () => {
    setupStore({ accessToken: "token" });

    const { result } = setupHook({
      communityDecks: [
        makeCommunityDeck({ id: "comm_1", originalDeckId: undefined }),
      ],
    });

    await act(async () => {
      await result.current.handleUnpublishDeck("comm_1");
    });

    await act(async () => {
      await result.current.confirmUnpublish();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Cannot unpublish: Missing original deck ID",
    );
    expect(unpublishDeck).not.toHaveBeenCalled();
  });

  it("confirmUnpublish unpublishes, refreshes decks+community, closes dialog", async () => {
    const store = setupStore({ accessToken: "token" });

    (unpublishDeck as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (fetchDecks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeUserDeck({ id: "after_unpub" }),
    ]);

    const loadCommunityDecks = vi.fn().mockResolvedValue(undefined);
    const setViewingDeck = vi.fn();

    const deck = makeCommunityDeck({ id: "comm_1", originalDeckId: "orig_1" });

    const { result } = setupHook({
      loadCommunityDecks,
      communityDecks: [deck],
      viewingDeck: deck,
      setViewingDeck,
    });

    await act(async () => {
      await result.current.handleUnpublishDeck("comm_1");
    });

    await act(async () => {
      await result.current.confirmUnpublish();
    });

    expect(unpublishDeck).toHaveBeenCalledWith("token", "orig_1");
    expect(loadCommunityDecks).toHaveBeenCalled();
    expect(fetchDecks).toHaveBeenCalledWith("token");
    expect(store.setDecks).toHaveBeenCalledWith([
      makeUserDeck({ id: "after_unpub" }),
    ]);

    // if viewing same deck, it clears
    expect(setViewingDeck).toHaveBeenCalledWith(null);

    expect(result.current.unpublishDialogOpen).toBe(false);
    expect(result.current.unpublishingDeck).toBe(null);
  });

  it("publishableDecks excludes imported decks and empty decks", () => {
    setupStore({
      user: { id: "user-1", subscriptionTier: "free" },
      decks: [
        makeUserDeck({
          id: "a",
          userId: "user-1",
          cardCount: 10,
          sourceCommunityDeckId: undefined, // ✅ FIX
        }),
        makeUserDeck({
          id: "b",
          userId: "user-1",
          cardCount: 0,
          sourceCommunityDeckId: undefined, // ✅ FIX
        }),
        makeUserDeck({
          id: "c",
          userId: "user-1",
          cardCount: 10,
          sourceCommunityDeckId: "comm_x", // imported → excluded
        }),
      ],
    });

    const { result } = setupHook();

    expect(result.current.publishableDecks.map((d: UIDeck) => d.id)).toEqual([
      "a",
    ]);
  });

  it("handlePublishDeck validates and calls publishDeck + updates store + reloads community", async () => {
    const store = setupStore({
      accessToken: "token",
      decks: [
        makeUserDeck({
          id: "deck_pub",
          cardCount: 12,
          category: "Science",
          subtopic: "Bio",
          sourceCommunityDeckId: null,
        }),
      ],
    });

    const loadCommunityDecks = vi.fn().mockResolvedValue(undefined);

    (publishDeck as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      published: true,
      republished: false,
      deck: { id: "comm_published_id" },
    });

    const { result } = setupHook({ loadCommunityDecks });

    act(() => {
      result.current.setSelectedDeckId("deck_pub");
      result.current.setPublishDialogOpen(true);
    });

    await act(async () => {
      await result.current.handlePublishDeck();
    });

    expect(publishDeck).toHaveBeenCalledWith("token", "deck_pub", {
      category: "Science",
      subtopic: "Bio",
    });

    expect(store.updateDeck).toHaveBeenCalledWith("deck_pub", {
      communityPublishedId: "comm_published_id",
      isPublished: true,
    });

    expect(loadCommunityDecks).toHaveBeenCalled();
    expect(result.current.publishDialogOpen).toBe(false);
    expect(result.current.selectedDeckId).toBe("");
  });

  it("loadDeckById returns from list or falls back to API", async () => {
    setupStore();

    const inList = makeCommunityDeck({ id: "comm_in_list" });
    (getCommunityDeck as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeCommunityDeck({ id: "comm_from_api" }),
    );

    const { result } = setupHook({ communityDecks: [inList] });

    const a = await result.current.loadDeckById("comm_in_list");
    expect(a?.id).toBe("comm_in_list");
    expect(getCommunityDeck).not.toHaveBeenCalled();

    const b = await result.current.loadDeckById("comm_from_api");
    expect(b?.id).toBe("comm_from_api");
    expect(getCommunityDeck).toHaveBeenCalledWith("comm_from_api");
  });
});
