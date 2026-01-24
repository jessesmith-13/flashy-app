import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useStore } from "@/shared/state/useStore";
import { useIsSuperuser } from "@/shared/auth/roles";

import { canImportCommunityDecks } from "@/shared/entitlements/subscription";

import {
  addDeckFromCommunity,
  getCommunityDeck,
  publishDeck,
  unpublishDeck,
} from "@/shared/api/community";
import { updateImportedDeck, fetchDecks } from "@/shared/api/decks";
import {
  deleteCommunityDeck,
  deleteCommunityCard,
  toggleCommunityDeckFeatured,
} from "@/shared/api/admin";

import type { UIDeck } from "@/types/decks";
import type { UICommunityDeck } from "@/types/community";

type FlagItemDetails = {
  deckId?: string;
  commentText?: string;
  front?: string;
};

type UseCommunityActionsOpts = {
  loadCommunityDecks: () => Promise<void>;
  communityDecks: UICommunityDeck[];
  setViewingDeck?: (deck: UICommunityDeck | null) => void;
  viewingDeck?: UICommunityDeck | null;
  setUpgradeModalOpen: (open: boolean) => void;
  setUpgradeFeature: (f?: string) => void;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
};

export function useCommunityActions(opts: UseCommunityActionsOpts) {
  const {
    loadCommunityDecks,
    communityDecks,
    setViewingDeck,
    viewingDeck,
    setUpgradeModalOpen,
    setUpgradeFeature,
  } = opts;

  const {
    user,
    accessToken,
    updateDeck,
    decks,
    setDecks,
    setReturnToCommunityDeck,
    addDeck,
  } = useStore();

  const isSuperuser = useIsSuperuser();

  const [addingDeckId, setAddingDeckId] = useState<string | null>(null);

  // superuser action state
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [featuringDeckId, setFeaturingDeckId] = useState<string | null>(null);
  const [unpublishingDeckId, setUnpublishingDeckId] = useState<string | null>(
    null,
  );

  // update warning
  const [updateWarningOpen, setUpdateWarningOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    communityDeck: UICommunityDeck;
    importedDeck: UIDeck;
  } | null>(null);

  // deletion dialogs
  const [deleteDeckDialogOpen, setDeleteDeckDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<{
    id: string;
    name: string;
    deckId: string;
  } | null>(null);

  // unpublish dialog
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [unpublishingDeck, setUnpublishingDeck] =
    useState<UICommunityDeck | null>(null);

  // flags
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagItemType, setFlagItemType] = useState<
    "deck" | "card" | "comment" | "user"
  >("deck");
  const [flagItemId, setFlagItemId] = useState("");
  const [flagItemName, setFlagItemName] = useState("");
  const [flagItemDetails, setFlagItemDetails] = useState<
    FlagItemDetails | undefined
  >(undefined);
  const [flaggedDecks, setFlaggedDecks] = useState<Set<string>>(new Set());
  const [flaggedCards, setFlaggedCards] = useState<Set<string>>(new Set());

  // detail pagination (if you want it shared; otherwise keep local in view)
  const [deckDetailPage, setDeckDetailPage] = useState(1);

  // publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [publishing, setPublishing] = useState(false);

  const openFlagDialog = useCallback(
    (
      type: "deck" | "card" | "comment" | "user",
      id: string,
      name: string,
      deckId?: string,
    ) => {
      setFlagItemType(type);
      setFlagItemId(id);
      setFlagItemName(name);

      if (type === "card" && deckId) setFlagItemDetails({ deckId });
      else setFlagItemDetails(undefined);

      setFlagDialogOpen(true);

      if (type === "deck") setFlaggedDecks((prev) => new Set(prev).add(id));
      if (type === "card") setFlaggedCards((prev) => new Set(prev).add(id));
    },
    [],
  );

  // Reimport a community deck that has been updated/has changes
  const performUpdate = useCallback(
    async (communityDeck: UICommunityDeck, importedDeck: UIDeck) => {
      if (!accessToken) {
        toast.error("You must be logged in to update decks");
        return;
      }

      setAddingDeckId(communityDeck.id);
      try {
        const updatedDeck = await updateImportedDeck(
          accessToken,
          importedDeck.id,
          {
            name: communityDeck.name,
            color: communityDeck.color || "#10B981",
            emoji: communityDeck.emoji || "📚",
            cards: (communityDeck.cards ?? []).map((c, i) => ({
              id: c.id,
              deckId: importedDeck.id, // ✅ required for UICard
              front: c.front ?? "",
              back: c.back ?? "",
              cardType: c.cardType,

              correctAnswers: c.correctAnswers ?? null,
              incorrectAnswers: c.incorrectAnswers ?? null,
              acceptedAnswers: c.acceptedAnswers ?? null,

              audioUrl: c.audioUrl ?? null,
              frontImageUrl: c.frontImageUrl ?? null,
              backImageUrl: c.backImageUrl ?? null,
              frontAudio: c.frontAudio ?? null,
              backAudio: c.backAudio ?? null,

              position: c.position ?? i,

              // ✅ FIX: force required booleans (no undefined)
              favorite: c.favorite ?? false,
              isIgnored: c.isIgnored ?? false,

              createdAt: c.createdAt ?? new Date().toISOString(),
              updatedAt: c.updatedAt ?? new Date().toISOString(),
            })),
            category: communityDeck.category || "",
            subtopic: communityDeck.subtopic || "",
            version: communityDeck.version || 1,
          },
        );

        updateDeck(importedDeck.id, updatedDeck);
        toast.success(`${communityDeck.name} updated!`);
      } catch (err: unknown) {
        toast.error(`Failed to update deck: ${getErrorMessage(err)}`);
      } finally {
        setAddingDeckId(null);
      }
    },
    [accessToken, updateDeck],
  );

  const handleUpdateDeck = useCallback(
    async (communityDeck: UICommunityDeck, importedDeck: UIDeck) => {
      if (!accessToken) {
        toast.error("Please login to update decks");
        return;
      }

      const userHasEdits =
        importedDeck.updatedAt && importedDeck.lastSyncedAt
          ? new Date(importedDeck.updatedAt).getTime() >
            new Date(importedDeck.lastSyncedAt).getTime()
          : false;

      // ✅ If we might show the warning modal, fetch the detailed deck first
      if (userHasEdits) {
        const full = await getCommunityDeck(communityDeck.id);
        if (!full) {
          toast.error("Failed to load community deck details");
          return;
        }

        setPendingUpdate({ communityDeck: full, importedDeck });
        setUpdateWarningOpen(true);
        return;
      }

      await performUpdate(communityDeck, importedDeck);
    },
    [accessToken, performUpdate],
  );

  // Add a deck from community to user's personal decks
  const handleAddDeck = useCallback(
    async (deck: UICommunityDeck) => {
      if (!accessToken || !user) return;

      if (!canImportCommunityDecks(user.subscriptionTier, isSuperuser)) {
        setUpgradeFeature("importing Community decks");
        setUpgradeModalOpen(true);
        return;
      }

      if (deck.ownerId === user.id) {
        const alreadyInCollection = decks.find(
          (d) => d.communityPublishedId === deck.id && !d.isDeleted,
        );
        if (alreadyInCollection) {
          toast.info(`This is your own deck - it's already in "My Decks"`);
          return;
        } else {
          toast.info(`Re-adding your published deck to "My Decks"`);
        }
      } else {
        const alreadyImported = decks.find(
          (d) => d.sourceCommunityDeckId === deck.id && !d.isDeleted,
        );
        if (alreadyImported) {
          toast.info("You have already added this deck to your collection");
          return;
        }
      }

      setAddingDeckId(deck.id);
      try {
        const newDeck = await addDeckFromCommunity(accessToken, {
          communityDeckId: deck.id,
          name: deck.name,
          color: deck.color || "#10B981",
          emoji: deck.emoji || "📚",
          cards: (deck.cards || []).map((card) => ({
            front: card.front || "",
            back: card.back || "",
            cardType: card.cardType,
            correctAnswers: card.correctAnswers || undefined,
            incorrectAnswers: card.incorrectAnswers || undefined,
            acceptedAnswers: card.acceptedAnswers || undefined,
          })),
          category: deck.category,
          subtopic: deck.subtopic,
          version: deck.version || 1,
        });

        console.log("CARD COUNT:", newDeck.cardCount);

        if (!newDeck) {
          throw new Error("Server did not return deck");
        }

        toast.success(`"${deck.name}" added to your decks!`);
        addDeck(newDeck);

        if (viewingDeck && viewingDeck.id === deck.id && setViewingDeck) {
          setViewingDeck({
            ...viewingDeck,
            downloadCount: (viewingDeck.downloadCount || 0) + 1,
          });
        }
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        if (msg.includes("already added")) toast.info(msg);
        else toast.error(msg || "Failed to add deck");
      } finally {
        setAddingDeckId(null);
      }
    },
    [
      accessToken,
      user,
      isSuperuser,
      decks,
      addDeck,
      viewingDeck,
      setViewingDeck,
      setUpgradeFeature,
      setUpgradeModalOpen,
    ],
  );

  const handleToggleFeatured = useCallback(
    async (deckId: string) => {
      if (!accessToken || !isSuperuser) {
        toast.error("Unauthorized");
        return;
      }

      setFeaturingDeckId(deckId);
      try {
        const result = await toggleCommunityDeckFeatured(accessToken, deckId);
        await loadCommunityDecks();

        if (viewingDeck && viewingDeck.id === deckId && setViewingDeck) {
          setViewingDeck(result.deck);
        }

        toast.success("Deck featured status updated");
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to toggle featured status");
      } finally {
        setFeaturingDeckId(null);
      }
    },
    [accessToken, isSuperuser, loadCommunityDecks, viewingDeck, setViewingDeck],
  );

  const handleDeleteCommunityDeck = useCallback(
    (deckId: string, deckName: string) => {
      if (!accessToken || !isSuperuser) {
        toast.error("Unauthorized");
        return;
      }
      setDeckToDelete({ id: deckId, name: deckName });
      setDeleteDeckDialogOpen(true);
    },
    [accessToken, isSuperuser],
  );

  const confirmDeleteDeck = useCallback(
    async (reason: string) => {
      if (!deckToDelete || !accessToken) return;

      setDeletingDeckId(deckToDelete.id);
      try {
        await deleteCommunityDeck(accessToken, deckToDelete.id, reason);
        toast.success("Deck deleted successfully");

        await loadCommunityDecks();

        if (
          viewingDeck &&
          viewingDeck.id === deckToDelete.id &&
          setViewingDeck
        ) {
          setViewingDeck(null);
          setReturnToCommunityDeck(null);
        }

        setDeleteDeckDialogOpen(false);
        setDeckToDelete(null);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to delete deck");
      } finally {
        setDeletingDeckId(null);
      }
    },
    [
      accessToken,
      deckToDelete,
      loadCommunityDecks,
      viewingDeck,
      setViewingDeck,
      setReturnToCommunityDeck,
    ],
  );

  const handleDeleteCard = useCallback(
    (cardId: string, cardName: string, deckId: string) => {
      if (!accessToken || !isSuperuser) {
        toast.error("Unauthorized");
        return;
      }
      setCardToDelete({ id: cardId, name: cardName, deckId });
      setDeleteCardDialogOpen(true);
    },
    [accessToken, isSuperuser],
  );

  const confirmDeleteCard = useCallback(
    async (reason: string) => {
      if (!cardToDelete || !accessToken) return;

      try {
        await deleteCommunityCard(
          accessToken,
          cardToDelete.deckId,
          cardToDelete.id,
          reason,
        );
        toast.success("Card deleted successfully");

        // if on detail page, refresh the deck
        if (
          viewingDeck &&
          viewingDeck.id === cardToDelete.deckId &&
          setViewingDeck
        ) {
          await loadCommunityDecks();
          const updatedDeck = await getCommunityDeck(cardToDelete.deckId);
          if (updatedDeck) setViewingDeck(updatedDeck);
        }

        setDeleteCardDialogOpen(false);
        setCardToDelete(null);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to delete card");
      }
    },
    [
      accessToken,
      cardToDelete,
      loadCommunityDecks,
      viewingDeck,
      setViewingDeck,
    ],
  );

  // Unpublish a community deck
  const handleUnpublishDeck = useCallback(
    async (deckId: string) => {
      if (!accessToken) {
        toast.error("Please log in to unpublish decks");
        return;
      }

      const deck = communityDecks.find((d) => d.id === deckId);
      if (deck) {
        setUnpublishingDeck(deck);
        setUnpublishDialogOpen(true);
      }
    },
    [accessToken, communityDecks],
  );

  const confirmUnpublish = useCallback(async () => {
    if (!unpublishingDeck || !accessToken) return;

    if (!unpublishingDeck.originalDeckId) {
      toast.error("Cannot unpublish: Missing original deck ID");
      return;
    }

    setUnpublishingDeckId(unpublishingDeck.id);
    try {
      await unpublishDeck(accessToken, unpublishingDeck.originalDeckId);

      toast.success(
        `"${unpublishingDeck.name}" has been unpublished from the community`,
      );

      await loadCommunityDecks();

      const updatedDecks = await fetchDecks(accessToken);
      setDecks(updatedDecks);

      if (
        viewingDeck &&
        viewingDeck.id === unpublishingDeck.id &&
        setViewingDeck
      ) {
        setViewingDeck(null);
      }

      setUnpublishDialogOpen(false);
      setUnpublishingDeck(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to unpublish deck");
    } finally {
      setUnpublishingDeckId(null);
    }
  }, [
    accessToken,
    unpublishingDeck,
    loadCommunityDecks,
    setDecks,
    viewingDeck,
    setViewingDeck,
  ]);

  const publishableDecks = useMemo(() => {
    if (!user) return [];

    return decks.filter((d) => {
      const isMine = d.userId === user.id;
      const notDeleted = !d.isDeleted;
      const notShared = !d.isShared; // if you have this field
      const notImported = !d.sourceCommunityDeckId; // imported-from-community decks
      const hasCards = (d.cardCount ?? 0) > 0;

      return isMine && notDeleted && notShared && notImported && hasCards;
    });
  }, [decks, user]);

  // Publish a personal deck to the community
  const handlePublishDeck = useCallback(async () => {
    if (!accessToken || !selectedDeckId) {
      toast.error("Please select a deck");
      return;
    }

    const selectedDeck = decks.find((d) => d.id === selectedDeckId);
    if (!selectedDeck) {
      toast.error("Deck not found");
      return;
    }

    if (selectedDeck.sourceCommunityDeckId) {
      toast.error("Cannot publish decks imported from the community.");
      return;
    }

    if (!selectedDeck.category || !selectedDeck.subtopic) {
      toast.error("Please set a category and subtopic in deck settings first");
      return;
    }

    if (selectedDeck.cardCount < 10) {
      toast.error("Deck must have at least 10 cards to be published");
      return;
    }

    setPublishing(true);
    try {
      const result = await publishDeck(accessToken, selectedDeckId, {
        category: selectedDeck.category,
        subtopic: selectedDeck.subtopic,
      });

      if (result.republished) toast.success("Deck re-published successfully!");
      else if (result.published) toast.success("Deck published to community!");
      else toast.success("Deck updated successfully!");

      if (result.deck) {
        updateDeck(selectedDeckId, {
          communityPublishedId: result.deck.id,
          isPublished: true,
        });
      }

      setPublishDialogOpen(false);
      setSelectedDeckId("");

      await loadCommunityDecks();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to publish deck");
    } finally {
      setPublishing(false);
    }
  }, [accessToken, selectedDeckId, decks, updateDeck, loadCommunityDecks]);

  const loadDeckById = useCallback(
    async (deckId: string): Promise<UICommunityDeck | null> => {
      // 1) try existing list first
      const fromList = communityDecks.find((d) => d.id === deckId);
      if (fromList) return fromList;

      // 2) fallback to API
      return await getCommunityDeck(deckId);
    },
    [communityDecks],
  );

  return {
    // action states
    addingDeckId,
    deletingDeckId,
    featuringDeckId,
    unpublishingDeckId,

    // dialogs + payload
    publishDialogOpen,
    setPublishDialogOpen,
    selectedDeckId,
    setSelectedDeckId,
    publishing,
    publishableDecks,
    handlePublishDeck,

    deleteDeckDialogOpen,
    setDeleteDeckDialogOpen,
    deckToDelete,
    confirmDeleteDeck,
    loadDeckById,

    deleteCardDialogOpen,
    setDeleteCardDialogOpen,
    cardToDelete,
    confirmDeleteCard,

    unpublishDialogOpen,
    setUnpublishDialogOpen,
    unpublishingDeck,
    confirmUnpublish,

    updateWarningOpen,
    setUpdateWarningOpen,
    pendingUpdate,
    setPendingUpdate,
    performUpdate,

    // flags
    flagDialogOpen,
    setFlagDialogOpen,
    flagItemType,
    flagItemId,
    flagItemName,
    flagItemDetails,
    flaggedDecks,
    flaggedCards,
    openFlagDialog,

    // detail paging
    deckDetailPage,
    setDeckDetailPage,

    // handlers
    handleAddDeck,
    handleUpdateDeck,
    handleToggleFeatured,
    handleDeleteCommunityDeck,
    handleDeleteCard,
    handleUnpublishDeck,
  };
}
