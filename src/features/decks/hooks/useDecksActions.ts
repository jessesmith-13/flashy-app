import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import type { DifficultyLevel, UIDeck, UICard } from "@/types/decks";
import type { UICommunityCard } from "@/types/community";
import { useStore } from "@/shared/state/useStore";

import type {
  CreateDeckPayload,
  UpdateDeckPayload,
} from "@/shared/api/decks/types.api";
import {
  createDeck,
  deleteDeck,
  updateDeck,
  updateDeckPositions,
} from "@/shared/api/decks";

import { publishDeck, unpublishDeck } from "@/shared/api/community";

import {
  canCreateDeck,
  canPublishToCommunity,
} from "@/shared/entitlements/subscription";
import { getErrorMessage } from "@/shared/utils/error";

type ToggleKey = "favorite" | "learned";

/**
 * Map UICard -> CommunityCard
 * (Community API wants snake_case, community_deck_id, etc.)
 * Adjust fields here if your CommunityCard differs.
 */
export function uiCardToCommunityCard(
  card: UICard,
  communityDeckId: string,
): UICommunityCard {
  const nowIso = new Date().toISOString();

  return {
    id: card.id,
    communityDeckId,

    front: card.front ?? null,
    back: card.back ?? null,

    cardType: card.cardType,

    correctAnswers: card.correctAnswers ?? null,
    incorrectAnswers: card.incorrectAnswers ?? null,
    acceptedAnswers: card.acceptedAnswers ?? null,

    audioUrl: null,

    frontImageUrl: card.frontImageUrl ?? null,
    backImageUrl: card.backImageUrl ?? null,

    frontAudio: card.frontAudio ?? null,
    backAudio: card.backAudio ?? null,

    position: card.position ?? 0,

    isFlagged: false,
    isDeleted: false,
    deletedAt: null,
    deletedReason: null,
    deletedBy: null,
    deletedByName: null,

    createdAt: card.createdAt ?? nowIso,
    updatedAt: card.createdAt ?? nowIso,
  };
}

export function useDecksActions() {
  const {
    user,
    accessToken,
    decks,
    setDecks,
    addDeck,
    updateDeck: updateDeckInStore,
  } = useStore();

  const [draggedDeckId, setDraggedDeckId] = useState<string | null>(null);

  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [unpublishingDeckId, setUnpublishingDeckId] = useState<string | null>(
    null,
  );

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  // ✅ Pending UI state for per-deck toggles (favorite/learned)
  const [pendingToggleByDeckId, setPendingToggleByDeckId] = useState<
    Record<string, Partial<Record<ToggleKey, boolean>>>
  >({});

  // ✅ Request sequencing to prevent out-of-order responses from reverting UI
  const toggleSeqRef = useRef<
    Record<string, Partial<Record<ToggleKey, number>>>
  >({});

  const nextToggleSeq = useCallback((deckId: string, key: ToggleKey) => {
    const current = toggleSeqRef.current[deckId]?.[key] ?? 0;
    const next = current + 1;

    toggleSeqRef.current = {
      ...toggleSeqRef.current,
      [deckId]: {
        ...(toggleSeqRef.current[deckId] ?? {}),
        [key]: next,
      },
    };

    return next;
  }, []);

  const isLatestToggle = useCallback(
    (deckId: string, key: ToggleKey, seq: number) =>
      (toggleSeqRef.current[deckId]?.[key] ?? 0) === seq,
    [],
  );

  const setTogglePending = useCallback(
    (deckId: string, key: ToggleKey, value: boolean) => {
      setPendingToggleByDeckId((prev) => {
        const deckPending = prev[deckId] ?? {};
        const nextDeckPending = { ...deckPending, [key]: value };

        // cleanup when all falsy
        const hasAny = Object.values(nextDeckPending).some(Boolean);
        if (!hasAny) {
          const copy = { ...prev };
          delete copy[deckId];
          return copy;
        }

        return { ...prev, [deckId]: nextDeckPending };
      });
    },
    [],
  );

  const isTogglePending = useCallback(
    (deckId: string, key: ToggleKey) => !!pendingToggleByDeckId[deckId]?.[key],
    [pendingToggleByDeckId],
  );

  // ✅ memoized so callbacks can safely depend on it
  const requireAccessToken = useCallback((): string | null => {
    if (!accessToken) {
      toast.error("Please log in");
      return null;
    }
    return accessToken;
  }, [accessToken]);

  const onCreateDeckClick = useCallback(
    (openCreateDialog: () => void, isSuperuser: boolean) => {
      if (!user) return;

      if (!canCreateDeck(decks.length, user.subscriptionTier, isSuperuser)) {
        setUpgradeFeature("unlimited decks");
        setUpgradeModalOpen(true);
        return;
      }

      openCreateDialog();
    },
    [user, decks.length],
  );

  // ✅ Strongly type difficulty as DifficultyLevel
  const onCreateDeck = useCallback(
    async (data: {
      name: string;
      emoji: string;
      color: string;
      category?: string;
      subtopic?: string;
      difficulty?: DifficultyLevel;
      frontLanguage?: string;
      backLanguage?: string;
    }) => {
      const token = requireAccessToken();
      if (!token) return;

      const payload: CreateDeckPayload = {
        name: data.name,
        emoji: data.emoji,
        color: data.color,
        category: data.category,
        subtopic: data.subtopic,
        difficulty: data.difficulty,
        frontLanguage: data.frontLanguage,
        backLanguage: data.backLanguage,
      };

      try {
        const deck = await createDeck(token, payload);
        addDeck(deck);
        toast.success("Deck created successfully!");
      } catch (err: unknown) {
        console.error("Failed to create deck:", err);
        toast.error(getErrorMessage(err) ?? "Failed to create deck");
      }
    },
    [addDeck, requireAccessToken],
  );

  const onDeleteDeck = useCallback(
    async (deckId: string) => {
      const token = requireAccessToken();
      if (!token) return;

      setDeletingDeckId(deckId);
      try {
        const result = await deleteDeck(token, deckId);

        updateDeckInStore(deckId, {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
        });

        toast.success(
          result.deletedFromCommunity
            ? "Deck deleted from your collection and unpublished from community"
            : "Deck deleted successfully",
        );
      } catch (err: unknown) {
        console.error("Failed to delete deck:", err);
        toast.error(getErrorMessage(err) ?? "Failed to delete deck");
      } finally {
        setDeletingDeckId(null);
      }
    },
    [requireAccessToken, updateDeckInStore],
  );

  // ✅ Shared toggle helper (prevents optimistic “revert” due to races/out-of-order)
  const toggleDeckFlag = useCallback(
    async (deckId: string, key: ToggleKey) => {
      const token = requireAccessToken();
      if (!token) return;

      const deck = decks.find((d) => d.id === deckId);
      if (!deck) return;

      if (isTogglePending(deckId, key)) return;

      const prev = key === "favorite" ? !!deck.isFavorite : !!deck.isLearned;
      const next = !prev;

      // optimistic
      updateDeckInStore(
        deckId,
        key === "favorite" ? { isFavorite: next } : { isLearned: next },
      );
      setTogglePending(deckId, key, true);
      const seq = nextToggleSeq(deckId, key);

      try {
        if (key === "favorite") {
          await updateDeck(token, deckId, {
            isFavorite: next,
          } satisfies UpdateDeckPayload);
        } else {
          await updateDeck(token, deckId, {
            isLearned: next,
          } satisfies UpdateDeckPayload);
        }

        if (!isLatestToggle(deckId, key, seq)) return;
      } catch (err: unknown) {
        console.error(`Failed to toggle ${key}:`, err);

        if (isLatestToggle(deckId, key, seq)) {
          updateDeckInStore(
            deckId,
            key === "favorite" ? { isFavorite: prev } : { isLearned: prev },
          );
          toast.error(
            getErrorMessage(err) ??
              (key === "favorite"
                ? "Failed to update favorite status"
                : "Failed to update learned status"),
          );
        }
      } finally {
        if (isLatestToggle(deckId, key, seq)) {
          setTogglePending(deckId, key, false);
        }
      }
    },
    [
      decks,
      isLatestToggle,
      isTogglePending,
      nextToggleSeq,
      requireAccessToken,
      setTogglePending,
      updateDeckInStore,
    ],
  );

  const onToggleFavorite = useCallback(
    async (deckId: string) => {
      await toggleDeckFlag(deckId, "favorite");
    },
    [toggleDeckFlag],
  );

  const onToggleLearned = useCallback(
    async (deckId: string) => {
      await toggleDeckFlag(deckId, "learned");
    },
    [toggleDeckFlag],
  );

  // ---------- drag reorder ----------
  const onDragStart = useCallback((deckId: string) => {
    setDraggedDeckId(deckId);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    async (targetDeckId: string) => {
      const token = requireAccessToken();
      if (!token) return;
      if (!draggedDeckId || draggedDeckId === targetDeckId) return;

      const draggedIndex = decks.findIndex((d) => d.id === draggedDeckId);
      const targetIndex = decks.findIndex((d) => d.id === targetDeckId);
      if (draggedIndex === -1 || targetIndex === -1) return;

      const newDecks = [...decks];
      const [removed] = newDecks.splice(draggedIndex, 1);
      newDecks.splice(targetIndex, 0, removed);

      const updatedDecks = newDecks.map((d, idx) => ({ ...d, position: idx }));
      setDecks(updatedDecks);
      setDraggedDeckId(null);

      try {
        await updateDeckPositions(
          token,
          updatedDecks.map((d) => ({ id: d.id, position: d.position ?? 0 })),
        );
      } catch (err: unknown) {
        console.error("Failed to update deck positions:", err);
        toast.error(getErrorMessage(err) ?? "Failed to save deck order");
      }
    },
    [decks, draggedDeckId, requireAccessToken, setDecks],
  );

  // ---------- edit/update ----------
  const onUpdateDeck = useCallback(
    async (
      editingDeck: UIDeck,
      data: {
        name: string;
        emoji: string;
        color: string;
        category?: string;
        subtopic?: string;
        difficulty?: DifficultyLevel;
        frontLanguage?: string;
        backLanguage?: string;
      },
    ) => {
      const token = requireAccessToken();
      if (!token) return;

      const payload: UpdateDeckPayload = {
        name: data.name,
        emoji: data.emoji,
        color: data.color,
        category: data.category,
        subtopic: data.subtopic,
        difficulty: data.difficulty,
        frontLanguage: data.frontLanguage,
        backLanguage: data.backLanguage,
      };

      try {
        await updateDeck(token, editingDeck.id, payload);
        updateDeckInStore(editingDeck.id, payload as Partial<UIDeck>);

        // ... keep your community update block exactly the same ...
      } catch (err: unknown) {
        console.error("Failed to update deck:", err);
        toast.error(getErrorMessage(err) ?? "Failed to update deck");
      }
    },
    [requireAccessToken, updateDeckInStore],
  );

  // ---------- publish/unpublish ----------
  const publish = useCallback(
    async (deck: UIDeck) => {
      const token = requireAccessToken();
      if (!token) return;

      if (
        !canPublishToCommunity(
          user?.subscriptionTier,
          user?.isSuperuser,
          user?.isModerator,
        )
      ) {
        setUpgradeFeature("community publishing");
        setUpgradeModalOpen(true);
        return;
      }

      if (!deck.cardCount || deck.cardCount === 0) {
        toast.error("Cannot publish an empty deck");
        return;
      }
      if (deck.isShared) {
        toast.error("Cannot publish a shared deck to the community");
        return;
      }
      if (deck.cardCount < 10) {
        toast.error("Deck must have at least 10 cards to be published");
        return;
      }

      setPublishing(true);
      try {
        const result = await publishDeck(token, deck.id, {
          category: deck.category || undefined,
          subtopic: deck.subtopic || undefined,
        });

        updateDeckInStore(deck.id, {
          isPublished: true, // ✅ THIS is what DeckCard keys off of
          communityPublishedId: result.deck?.id,
          communityDeckVersion: result,
        });

        toast.success(
          result.updated || result.republished
            ? "Published deck updated successfully!"
            : "Deck published to community successfully!",
        );
      } catch (err: unknown) {
        console.error("Failed to publish deck:", err);

        const msg = getErrorMessage(err);
        if (msg?.includes("No changes detected")) {
          toast.info(
            "This deck is already published with no changes. Make edits to publish an update.",
          );
        } else {
          toast.error(msg ?? "Failed to publish deck to community");
        }
      } finally {
        setPublishing(false);
      }
    },
    [requireAccessToken, updateDeckInStore, user],
  );

  const unpublish = useCallback(
    async (deck: UIDeck) => {
      const token = requireAccessToken();
      if (!token) return;

      setUnpublishingDeckId(deck.id);
      try {
        await unpublishDeck(token, deck.id);
        updateDeckInStore(deck.id, { isPublished: false });
        toast.success(`"${deck.name}" has been unpublished from the community`);
      } catch (err: unknown) {
        console.error("Failed to unpublish deck:", err);
        toast.error(getErrorMessage(err) ?? "Failed to unpublish deck");
      } finally {
        setUnpublishingDeckId(null);
      }
    },
    [requireAccessToken, updateDeckInStore],
  );

  return {
    // state
    deletingDeckId,
    publishing,
    unpublishingDeckId,

    // per-deck toggle pending map
    pendingToggleByDeckId,
    isTogglePending,

    upgradeModalOpen,
    setUpgradeModalOpen,
    upgradeFeature,
    setUpgradeFeature,

    // actions
    onCreateDeckClick,
    onCreateDeck,
    onDeleteDeck,
    onToggleFavorite,
    onToggleLearned,
    onDragStart,
    onDragOver,
    onDrop,
    onUpdateDeck,
    publish,
    unpublish,
  };
}
