import { useState, useEffect } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../../../hooks/useNavigation";
// Import community-specific functions from API
import { getUserDeck } from "../../../utils/api/users";
import {
  toggleCommunityDeckFeatured,
  deleteCommunityDeck,
  deleteCommunityCard,
} from "../../../utils/api/admin";
import {
  fetchCommunityDecks,
  fetchFeaturedCommunityDecks,
  getCommunityDeck,
  fetchDownloadCounts,
  getDeckRatings,
  addDeckFromCommunity,
  searchCommunityUsers,
  unpublishDeck,
} from "../../../utils/api/community";
import { updateImportedDeck, fetchDecks } from "../../../utils/api/decks";
import { publishDeck } from "../../../utils/api/community";
import { toast } from "sonner";
import {
  canImportCommunityDecks,
  canPublishToCommunity,
} from "../../../utils/subscription";
import { useIsSuperuser } from "../../../utils/userUtils";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { Upload } from "lucide-react";
import { CommunityDeckGrid } from "./CommunityDeckGrid";
import { CommunityDeckDetail } from "./CommunityDeckDetail";
import { CommunityFilters } from "./CommunityFilters";
import { UserProfileView } from "./UserProfileView";
import { UserDeckViewer } from "./UserDeckViewer";
import { Pagination } from "../Pagination/Pagination";
import { UpgradeModal } from "../UpgradeModal";
import { FlagDialog } from "./FlagDialog";
import { DeletionDialog } from "./DeletionDialog";
import { UpdateDeckWarningDialog } from "./UpdateDeckWarningDialog";
import { UIDeck } from "@/types/decks";
import { UICommunityDeck, UICommunityCard } from "@/types/community";

interface FlagItemDetails {
  deckId?: string;
  commentText?: string;
  front?: string;
}

export function CommunityScreen() {
  const {
    user,
    accessToken,
    updateDeck,
    decks,
    setDecks,
    setTemporaryStudyDeck,
    setReturnToCommunityDeck,
    setReturnToUserDeck,
    returnToCommunityDeck,
    returnToUserDeck,
    viewingCommunityDeckId,
    setViewingCommunityDeckId,
    targetCommentId,
    setTargetCommentId,
    targetCardIndex,
    viewingUserId,
    setViewingUserId,
    userProfileReturnView,
    setUserProfileReturnView,
  } = useStore();
  const { navigateTo } = useNavigation();
  const isSuperuser = useIsSuperuser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewingUserDeck, setViewingUserDeck] = useState<{
    deck: UICommunityDeck;
    cards: UICommunityCard[];
    ownerId: string;
  } | null>(null);
  const [addingDeckId, setAddingDeckId] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [viewingDeck, setViewingDeck] = useState<UICommunityDeck | null>(null);
  const [communityDecks, setCommunityDecks] = useState<UICommunityDeck[]>([]);
  const [featuredDecks, setFeaturedDecks] = useState<UICommunityDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchedUsers, setSearchedUsers] = useState<
    { id: string; name: string; deckCount: number }[]
  >([]);
  const [updateWarningOpen, setUpdateWarningOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    communityDeck: UICommunityDeck;
    importedDeck: UIDeck;
  } | null>(null);

  // Superuser state
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [featuringDeckId, setFeaturingDeckId] = useState<string | null>(null);
  const [unpublishingDeckId, setUnpublishingDeckId] = useState<string | null>(
    null
  );
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [unpublishingDeck, setUnpublishingDeck] =
    useState<UICommunityDeck | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSubtopic, setFilterSubtopic] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "newest">(
    "popular"
  );
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showFlashyDecksOnly, setShowFlashyDecksOnly] = useState(false);
  const [showMyPublishedOnly, setShowMyPublishedOnly] = useState(false);
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deckDetailPage, setDeckDetailPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const CARDS_PER_PAGE = 20;

  // Flag/Report state
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

  // Deletion dialog state
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

  // Fetch community decks on mount
  useEffect(() => {
    console.log("🚀 CommunityScreen mounted - calling loadCommunityDecks()");
    loadCommunityDecks();
  }, []);

  // Restore viewing deck when returning from study
  useEffect(() => {
    if (returnToCommunityDeck) {
      setViewingDeck(returnToCommunityDeck);
    }
    if (returnToUserDeck) {
      setViewingUserDeck({
        ...returnToUserDeck,
        cards: returnToUserDeck.cards as UICommunityCard[],
      });
    }
  }, []);

  // Reset to page 1 when filters or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterCategory,
    filterSubtopic,
    sortBy,
    showFeaturedOnly,
    showFlashyDecksOnly,
    showMyPublishedOnly,
    showUpdatesOnly,
  ]);

  // Search for users when search query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length >= 2) {
        try {
          const users = await searchCommunityUsers(searchQuery);
          setSearchedUsers(users);
        } catch (error) {
          console.error("Failed to search users:", error);
          setSearchedUsers([]);
        }
      } else {
        setSearchedUsers([]);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Reset deck detail page when viewing a new deck (unless we're navigating to a specific card)
  useEffect(() => {
    if (!targetCardIndex) {
      setDeckDetailPage(1);
    }
  }, [viewingDeck?.id]);

  // Listen for custom event to view user profile
  useEffect(() => {
    const handleViewUserProfile = (event: any) => {
      if (event.detail?.userId) {
        setSelectedUserId(event.detail.userId);
      }
    };

    window.addEventListener("viewUserProfile", handleViewUserProfile);

    return () => {
      window.removeEventListener("viewUserProfile", handleViewUserProfile);
    };
  }, []);

  // Watch for viewingUserId from Zustand store
  useEffect(() => {
    if (viewingUserId) {
      setSelectedUserId(viewingUserId);
      setViewingUserId(null);
    }
  }, [viewingUserId, setViewingUserId]);

  // Listen for notification-triggered deck viewing
  useEffect(() => {
    if (viewingCommunityDeckId && !loading) {
      const deckToView = communityDecks.find(
        (d) => d.id === viewingCommunityDeckId
      );
      if (deckToView) {
        setViewingDeck(deckToView);
        setViewingCommunityDeckId(null);
      } else {
        fetchDeckById(viewingCommunityDeckId);
      }
    }
  }, [viewingCommunityDeckId, communityDecks, loading]);

  const fetchDeckById = async (deckId: string) => {
    console.log("🔍 fetchDeckById called with:", deckId);
    try {
      console.log("📡 Calling getCommunityDeck...");
      const deck = await getCommunityDeck(deckId);
      console.log("✅ Got deck:", deck);
      if (deck) {
        setViewingDeck(deck);
        setViewingCommunityDeckId(null);
      } else {
        console.log("❌ Deck returned null/undefined");
        toast.error(
          "This deck is not available in the community. It may have been deleted or is a personal deck."
        );
        setViewingCommunityDeckId(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch deck:", error);
      toast.error(
        "This deck is not available in the community. It may have been deleted or is a personal deck."
      );
      setViewingCommunityDeckId(null);
    }
  };

  const loadCommunityDecks = async () => {
    console.log("📡 loadCommunityDecks called");
    try {
      console.log("  Fetching published and featured decks...");
      const [publishedDecks, featuredPublishedDecks] = await Promise.all([
        fetchCommunityDecks(),
        fetchFeaturedCommunityDecks(),
      ]);

      // Use only real published decks
      const allDecks = publishedDecks;

      // Get all deck IDs
      const allDeckIds = allDecks.map((d) => d.id);

      console.log("  📊 Fetching download counts and ratings...");

      // Get download counts for all decks
      const downloadCounts = await fetchDownloadCounts(allDeckIds);

      // Get ratings for all decks
      const ratingsPromises = allDeckIds.map((id) =>
        getDeckRatings(id).catch(() => ({
          averageRating: 0,
          totalRatings: 0,
          userRating: null,
        }))
      );
      const ratingsData = await Promise.all(ratingsPromises);
      const ratingsMap = allDeckIds.reduce((acc, id, index) => {
        acc[id] = ratingsData[index];
        return acc;
      }, {} as Record<string, any>);

      // Update decks with real download counts and ratings
      const updatedDecks = allDecks.map((deck) => ({
        ...deck,
        downloads: downloadCounts[deck.id] || deck.downloadCount || 0,
        rating: ratingsMap[deck.id]?.averageRating || 0,
        ratingCount: ratingsMap[deck.id]?.totalRatings || 0,
      }));

      // Update featured decks with ratings and download counts
      const updatedFeaturedDecks = (
        Array.isArray(featuredPublishedDecks)
          ? featuredPublishedDecks
          : [featuredPublishedDecks]
      ).map((deck: UICommunityDeck) => ({
        ...deck,
        downloads: downloadCounts[deck.id] || deck.downloadCount || 0,
        rating: ratingsMap[deck.id]?.averageRating || 0,
        ratingCount: ratingsMap[deck.id]?.totalRatings || 0,
      }));

      console.log("  📊 Final deck counts:");
      console.log("    - Community decks:", updatedDecks.length);
      console.log("    - Featured decks:", updatedFeaturedDecks.length);

      setCommunityDecks(updatedDecks);
      setFeaturedDecks(updatedFeaturedDecks);
    } catch (error) {
      console.error("❌ Failed to load community decks:", error);
      setCommunityDecks([]);
      setFeaturedDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeck = async (deck: UICommunityDeck) => {
    if (!accessToken || !user) return;

    if (!canImportCommunityDecks(user?.subscriptionTier, isSuperuser)) {
      setUpgradeFeature("importing Community decks");
      setUpgradeModalOpen(true);
      return;
    }

    if (deck.ownerId === user.id) {
      // ✅ ADD: && !d.isDeleted
      const alreadyInCollection = decks.find(
        (d) => d.communityPublishedId === deck.id && !d.isDeleted
      );
      if (alreadyInCollection) {
        toast.info('This is your own deck - it\'s already in "My Decks"');
        return;
      } else {
        toast.info('Re-adding your published deck to "My Decks"');
      }
    }

    if (deck.ownerId !== user.id) {
      // ✅ ADD: && !d.isDeleted
      const alreadyImported = decks.find(
        (d) => d.sourceCommunityDeckId === deck.id && !d.isDeleted
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
          back: card.back || "", // In case back is null for MC cards
          cardType: card.cardType,
          correctAnswers: card.correctAnswers || undefined,
          incorrectAnswers: card.incorrectAnswers || undefined,
          acceptedAnswers: card.acceptedAnswers || undefined,
        })),
        category: deck.category,
        subtopic: deck.subtopic,
        version: deck.version || 1,
      });

      toast.success(`"${deck.name}" added to your decks!`);
      console.log("Added deck from community:", newDeck);

      const updatedDecks = await fetchDecks(accessToken);
      setDecks(updatedDecks);

      await loadCommunityDecks();

      if (viewingDeck && viewingDeck.id === deck.id) {
        setViewingDeck({
          ...viewingDeck,
          downloadCount: (viewingDeck.downloadCount || 0) + 1,
        });
      }
    } catch (error: any) {
      console.error("Failed to add deck:", error);
      if (error.message.includes("already added")) {
        toast.info(error.message);
      } else {
        toast.error(error.message);
      }
    } finally {
      setAddingDeckId(null);
    }
  };

  const handleUpdateDeck = async (
    communityDeck: UICommunityDeck,
    importedDeck: UIDeck
  ) => {
    if (!accessToken) {
      toast.error("Please login to update decks");
      return;
    }

    // ✅ CHECK: Has user made local edits?
    const userHasEdits =
      importedDeck.updatedAt && importedDeck.lastSyncedAt
        ? new Date(importedDeck.updatedAt).getTime() >
          new Date(importedDeck.lastSyncedAt).getTime()
        : false;

    if (userHasEdits) {
      // Show warning dialog
      setPendingUpdate({ communityDeck, importedDeck });
      setUpdateWarningOpen(true);
      return;
    }

    // No edits, proceed with update
    await performUpdate(communityDeck, importedDeck);
  };

  const performUpdate = async (
    communityDeck: UICommunityDeck,
    importedDeck: UIDeck
  ) => {
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
          cards: communityDeck.cards || [],
          category: communityDeck.category || "",
          subtopic: communityDeck.subtopic || "",
          version: communityDeck.version || 1,
        }
      );

      updateDeck(importedDeck.id, updatedDeck);
      toast.success(`${communityDeck.name} updated!`);
    } catch (error: any) {
      console.error("Failed to update deck:", error);
      toast.error(`Failed to update deck: ${error.message}`);
    } finally {
      setAddingDeckId(null);
    }
  };

  const handlePublishDeck = async () => {
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
      toast.error(
        "Cannot publish decks imported from the community. Only decks you created can be published."
      );
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
      console.log("📤 Publishing deck:", selectedDeckId);
      const result = await publishDeck(accessToken, selectedDeckId, {
        category: selectedDeck.category,
        subtopic: selectedDeck.subtopic,
      });

      console.log("✅ Publish result:", result);

      if (result.republished) {
        toast.success("Deck re-published successfully!");
      } else if (result.published) {
        toast.success("Deck published to community!");
      } else {
        toast.success("Deck updated successfully!");
      }

      // Update the deck in the local store
      if (result.deck) {
        updateDeck(selectedDeckId, {
          communityPublishedId: result.deck.id,
          isPublished: true,
        });
      }

      setPublishDialogOpen(false);
      setSelectedDeckId("");

      // Reload community decks to show the newly published deck
      await loadCommunityDecks();
    } catch (error: any) {
      console.error("❌ Failed to publish deck:", error);
      toast.error(error.message || "Failed to publish deck");
    } finally {
      setPublishing(false);
    }
  };

  const handleViewDeckFromProfile = async (deckId: string, userId: string) => {
    try {
      if (!accessToken) {
        toast.error("Please log in to view decks");
        return;
      }

      const { deck, cards } = await getUserDeck(accessToken, userId, deckId);

      setViewingUserDeck({ deck, cards, ownerId: userId });
      setSelectedUserId(null);
    } catch (error: any) {
      console.error("Failed to load user deck:", error);
      toast.error(error.message || "Failed to load deck");
    }
  };

  const openFlagDialog = (
    type: "deck" | "card" | "comment" | "user",
    id: string,
    name: string,
    deckId?: string
  ) => {
    setFlagItemType(type);
    setFlagItemId(id);
    setFlagItemName(name);
    if (type === "card" && deckId) {
      setFlagItemDetails({ deckId });
    } else {
      setFlagItemDetails(undefined);
    }
    setFlagDialogOpen(true);
    if (type === "deck") setFlaggedDecks(new Set([...flaggedDecks, id]));
    if (type === "card") setFlaggedCards(new Set([...flaggedCards, id]));
  };

  const handleDeleteCommunityDeck = async (
    deckId: string,
    deckName: string
  ) => {
    if (!accessToken || !isSuperuser) {
      toast.error("Unauthorized");
      return;
    }

    setDeckToDelete({ id: deckId, name: deckName });
    setDeleteDeckDialogOpen(true);
  };

  const confirmDeleteDeck = async (reason: string) => {
    if (!deckToDelete || !accessToken) return;

    setDeletingDeckId(deckToDelete.id);
    try {
      await deleteCommunityDeck(accessToken, deckToDelete.id, reason);
      toast.success("Deck deleted successfully");

      await loadCommunityDecks();

      if (viewingDeck && viewingDeck.id === deckToDelete.id) {
        setViewingDeck(null);
        setReturnToCommunityDeck(null);
      }

      setDeleteDeckDialogOpen(false);
      setDeckToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete deck:", error);
      toast.error(error.message || "Failed to delete deck");
    } finally {
      setDeletingDeckId(null);
    }
  };

  const handleToggleFeatured = async (deckId: string) => {
    if (!accessToken || !isSuperuser) {
      toast.error("Unauthorized");
      return;
    }

    setFeaturingDeckId(deckId);
    try {
      const result = await toggleCommunityDeckFeatured(accessToken, deckId);
      // toast.success(result.message)

      await loadCommunityDecks();

      if (viewingDeck && viewingDeck.id === deckId) {
        setViewingDeck(result.deck);
      }
    } catch (error: any) {
      console.error("Failed to toggle featured status:", error);
      toast.error(error.message || "Failed to toggle featured status");
    } finally {
      toast.success("Deck featured status updated");
      setFeaturingDeckId(null);
    }
  };

  const handleUnpublishDeck = async (deckId: string) => {
    if (!accessToken) {
      toast.error("Please log in to unpublish decks");
      return;
    }

    const deck = communityDecks.find((d) => d.id === deckId);
    if (deck) {
      setUnpublishingDeck(deck);
      setUnpublishDialogOpen(true);
    }
  };

  const confirmUnpublish = async () => {
    if (!unpublishingDeck || !accessToken) return;

    // ✅ Check if originalDeckId exists
    if (!unpublishingDeck.originalDeckId) {
      toast.error("Cannot unpublish: Missing original deck ID");
      return;
    }

    setUnpublishingDeckId(unpublishingDeck.id);
    try {
      // ✅ Now TypeScript knows it's not null
      await unpublishDeck(accessToken, unpublishingDeck.originalDeckId);

      toast.success(
        `"${unpublishingDeck.name}" has been unpublished from the community`
      );

      await loadCommunityDecks();

      // Fetch USER's personal decks, not community decks
      const updatedDecks = await fetchDecks(accessToken);
      setDecks(updatedDecks);

      if (viewingDeck && viewingDeck.id === unpublishingDeck.id) {
        setViewingDeck(null);
      }

      setUnpublishDialogOpen(false);
      setUnpublishingDeck(null);
    } catch (error: any) {
      console.error("Failed to unpublish deck:", error);
      toast.error(error.message || "Failed to unpublish deck");
    } finally {
      setUnpublishingDeckId(null);
    }
  };

  const handleStudyDeck = (deck: any) => {
    setTemporaryStudyDeck({
      deck: deck,
      cards: deck.cards,
    });
    setReturnToCommunityDeck(deck);
    navigateTo("study");
  };

  // I think this is for admin/superuser only
  const handleDeleteCard = (
    cardId: string,
    cardName: string,
    deckId: string
  ) => {
    if (!accessToken || !isSuperuser) {
      toast.error("Unauthorized");
      return;
    }

    setCardToDelete({ id: cardId, name: cardName, deckId });
    setDeleteCardDialogOpen(true);
  };

  const confirmDeleteCard = async (reason: string) => {
    if (!cardToDelete || !accessToken) return;

    try {
      await deleteCommunityCard(
        accessToken,
        cardToDelete.deckId,
        cardToDelete.id,
        reason
      );
      toast.success("Card deleted successfully");

      if (viewingDeck && viewingDeck.id === cardToDelete.deckId) {
        await loadCommunityDecks();

        const updatedDeck = await getCommunityDeck(cardToDelete.deckId);
        if (updatedDeck) {
          setViewingDeck(updatedDeck);
        }
      }

      setDeleteCardDialogOpen(false);
      setCardToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete card:", error);
      toast.error(error.message || "Failed to delete card");
    }
  };

  // If viewing a user profile, show that instead
  if (selectedUserId) {
    return (
      <UserProfileView
        userId={selectedUserId}
        onBack={() => {
          if (userProfileReturnView === "profile") {
            navigateTo("profile");
            setUserProfileReturnView(null);
          } else if (userProfileReturnView === "superuser") {
            navigateTo("superuser");
            setUserProfileReturnView(null);
          }
          setSelectedUserId(null);
        }}
        onViewDeck={handleViewDeckFromProfile}
        onViewUser={setSelectedUserId}
      />
    );
  }

  // If viewing a user deck (read-only), show that
  if (viewingUserDeck) {
    return (
      <UserDeckViewer
        deck={{
          ...viewingUserDeck.deck,
          is_public: viewingUserDeck.deck.isPublished || false,
          emoji: viewingUserDeck.deck.emoji || "📚",
          color: viewingUserDeck.deck.color || "#10B981",
        }}
        cards={viewingUserDeck.cards.map((card) => ({
          ...card,
          front: card.front || "",
          back: card.back || "",
        }))}
        ownerId={viewingUserDeck.ownerId}
        isOwner={user?.id === viewingUserDeck.ownerId}
        onBack={() => {
          setSelectedUserId(viewingUserDeck.ownerId);
          setViewingUserDeck(null);
          setReturnToUserDeck(null);
        }}
        onStudy={(deck, cards) => {
          const mappedCards = cards.map((card, index) => ({
            ...card,
            favorite: false,
            isIgnored: false,
            deckId: deck.id,
            createdAt: new Date().toISOString(),
            position: card.position ?? index,
          }));

          setTemporaryStudyDeck({
            deck: {
              id: deck.id,
              name: deck.name,
              color: deck.color,
              emoji: deck.emoji,
              cardCount: viewingUserDeck.deck.card_count,
              category: deck.category || "",
              subtopic: deck.subtopic || "",
              ownerId: viewingUserDeck.ownerId,
              ownerDisplayName:
                viewingUserDeck.deck.owner_display_name || "Unknown",
              cards: mappedCards,
              publishedAt:
                viewingUserDeck.deck.published_at || new Date().toISOString(),
              downloadCount: viewingUserDeck.deck.download_count || 0,
              createdAt: viewingUserDeck.deck.created_at,
              frontLanguage: deck.front_language,
              backLanguage: deck.back_language,
            },
            cards: mappedCards,
          });
          setReturnToUserDeck(viewingUserDeck);
          navigateTo("study");
        }}
      />
    );
  }

  // If viewing a deck, show deck details
  if (viewingDeck) {
    return (
      <CommunityDeckDetail
        deck={viewingDeck}
        cards={viewingDeck.cards || []}
        userDecks={decks}
        isSuperuser={isSuperuser}
        addingDeckId={addingDeckId}
        deletingDeckId={deletingDeckId}
        featuringDeckId={featuringDeckId}
        deckDetailPage={deckDetailPage}
        cardsPerPage={CARDS_PER_PAGE}
        flaggedDecks={flaggedDecks}
        flaggedCards={flaggedCards}
        targetCommentId={targetCommentId}
        targetCardIndex={targetCardIndex}
        onBack={() => {
          setViewingDeck(null);
          setReturnToCommunityDeck(null);
          setTargetCommentId(null);
        }}
        onViewUser={setSelectedUserId}
        onAddDeck={handleAddDeck}
        onUpdateDeck={handleUpdateDeck}
        onToggleFeatured={handleToggleFeatured}
        onDeleteDeck={handleDeleteCommunityDeck}
        onFlagDeck={(deckId, deckName) =>
          openFlagDialog("deck", deckId, deckName)
        }
        onFlagCard={(cardId, cardName) =>
          openFlagDialog("card", cardId, cardName, viewingDeck.id)
        }
        onFlagComment={(commentId, commentText) =>
          openFlagDialog("comment", commentId, commentText)
        }
        onFlagUser={(userId, userName) =>
          openFlagDialog("user", userId, userName)
        }
        onStudyDeck={handleStudyDeck}
        onDeckDetailPageChange={setDeckDetailPage}
        onRatingChange={loadCommunityDecks}
        onDeleteCard={handleDeleteCard}
      />
    );
  }

  // Filter and sort decks
  let filteredDecks = communityDecks.filter((deck) => {
    const matchesSearch =
      deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.subtopic?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || deck.category === filterCategory;
    const matchesSubtopic =
      filterSubtopic === "all" || deck.subtopic === filterSubtopic;
    const matchesFeatured = !showFeaturedOnly || deck.featured === true;
    const matchesFlashy =
      !showFlashyDecksOnly || deck.ownerDisplayName === "Flashy";
    const matchesMyPublished =
      !showMyPublishedOnly || deck.ownerId === user?.id;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubtopic &&
      matchesFeatured &&
      matchesFlashy &&
      matchesMyPublished
    );
  });

  // Sort decks
  filteredDecks = [...filteredDecks].sort((a, b) => {
    if (sortBy === "popular") return b.downloadCount - a.downloadCount;
    if (sortBy === "rating") {
      const ratingA = a.averageRating || 0;
      const ratingB = b.averageRating || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      return (b.ratingCount || 0) - (a.ratingCount || 0);
    }
    if (sortBy === "newest") {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    }
    return 0;
  });

  const showingFeaturedSection =
    featuredDecks.length > 0 &&
    !searchQuery &&
    filterCategory === "all" &&
    !showFeaturedOnly;
  const decksForGrid = showingFeaturedSection
    ? filteredDecks.filter(
        (deck) => !featuredDecks.some((fd) => fd.id === deck.id)
      )
    : filteredDecks;

  // Pagination
  const totalPages = Math.ceil(decksForGrid.length / ITEMS_PER_PAGE);
  const paginatedDecks = decksForGrid.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const publishableDecks = decks.filter(
    (d) => !d.sourceCommunityDeckId && d.cardCount > 0
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">
            Loading community decks...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 pb-16 sm:pb-6 lg:pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                  Community Decks
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Discover and share decks with learners worldwide
                </p>
              </div>

              {/* Publish Deck Button */}
              <Dialog
                open={publishDialogOpen}
                onOpenChange={setPublishDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10"
                    onClick={(e) => {
                      if (
                        !canPublishToCommunity(
                          user?.subscriptionTier,
                          user?.isSuperuser,
                          user?.isModerator
                        )
                      ) {
                        e.preventDefault();
                        setUpgradeFeature("community publishing");
                        setUpgradeModalOpen(true);
                      }
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Publish Deck
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Publish Deck to Community</DialogTitle>
                    <DialogDescription>
                      Share your deck with the community
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="deck">Select Deck</Label>
                      <Select
                        value={selectedDeckId}
                        onValueChange={setSelectedDeckId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a deck..." />
                        </SelectTrigger>
                        <SelectContent>
                          {publishableDecks.map((deck) => (
                            <SelectItem
                              key={deck.id}
                              value={deck.id}
                              disabled={
                                deck.cardCount < 10 ||
                                !deck.category ||
                                !deck.subtopic
                              }
                            >
                              {deck.emoji} {deck.name} ({deck.cardCount} cards)
                              {deck.communityPublishedId ? " • Published" : ""}
                              {deck.cardCount < 10 ? " • Needs 10+ cards" : ""}
                              {!deck.category || !deck.subtopic
                                ? " • Needs category"
                                : ""}
                            </SelectItem>
                          ))}
                          {publishableDecks.length === 0 && (
                            <div className="px-2 py-1 text-sm text-gray-500">
                              No decks available to publish. Create a deck with
                              10+ cards and set its category.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedDeckId &&
                      (() => {
                        const selectedDeck = decks.find(
                          (d) => d.id === selectedDeckId
                        );
                        if (!selectedDeck) return null;

                        return (
                          <>
                            {selectedDeck.category && selectedDeck.subtopic ? (
                              <>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                      style={{
                                        backgroundColor: selectedDeck.color,
                                      }}
                                    >
                                      {selectedDeck.emoji}
                                    </div>
                                    <div>
                                      <h3 className="font-medium dark:text-gray-100">
                                        {selectedDeck.name}
                                      </h3>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {selectedDeck.cardCount}{" "}
                                        {selectedDeck.cardCount === 1
                                          ? "card"
                                          : "cards"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                      {selectedDeck.category}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                      {selectedDeck.subtopic}
                                    </span>
                                  </div>
                                </div>

                                {selectedDeck.communityPublishedId && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    This deck is already published. Publishing
                                    again will update it with your latest
                                    changes.
                                  </p>
                                )}
                              </>
                            ) : (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                  This deck needs a category and subtopic.
                                  Please edit the deck to set these before
                                  publishing.
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}

                    <Button
                      onClick={handlePublishDeck}
                      disabled={publishing || !selectedDeckId}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {publishing
                        ? "Publishing..."
                        : (() => {
                            const selectedDeck = decks.find(
                              (d) => d.id === selectedDeckId
                            );
                            return selectedDeck?.communityPublishedId
                              ? "Update Published Deck"
                              : "Publish to Community";
                          })()}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filters */}
            <CommunityFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterCategory={filterCategory}
              onCategoryChange={setFilterCategory}
              filterSubtopic={filterSubtopic}
              onSubtopicChange={setFilterSubtopic}
              sortBy={sortBy}
              onSortChange={setSortBy}
              showFeaturedOnly={showFeaturedOnly}
              onToggleFeatured={() => setShowFeaturedOnly(!showFeaturedOnly)}
              showFlashyDecksOnly={showFlashyDecksOnly}
              onToggleFlashy={() =>
                setShowFlashyDecksOnly(!showFlashyDecksOnly)
              }
              showMyPublishedOnly={showMyPublishedOnly}
              onToggleMyPublished={() =>
                setShowMyPublishedOnly(!showMyPublishedOnly)
              }
              showUpdatesOnly={showUpdatesOnly}
              onToggleUpdates={() => setShowUpdatesOnly(!showUpdatesOnly)}
            />
          </div>

          {/* User Search Results */}
          {searchedUsers.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Users
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {searchedUsers.length}{" "}
                  {searchedUsers.length === 1 ? "user" : "users"} found
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchedUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.deckCount}{" "}
                        {user.deckCount === 1 ? "deck" : "decks"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Decks Section Header */}
          {searchQuery && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Decks
              </h2>
            </div>
          )}

          {/* Decks Grid */}
          <CommunityDeckGrid
            decks={paginatedDecks}
            featuredDecks={featuredDecks}
            showFeaturedSection={showingFeaturedSection}
            showFeaturedOnly={showFeaturedOnly}
            showUpdatesOnly={showUpdatesOnly}
            searchQuery={searchQuery}
            filterCategory={filterCategory}
            userDecks={decks}
            userId={user?.id || null}
            isSuperuser={isSuperuser}
            addingDeckId={addingDeckId}
            deletingDeckId={deletingDeckId}
            featuringDeckId={featuringDeckId}
            unpublishingDeckId={unpublishingDeckId}
            onViewDeck={setViewingDeck}
            onViewUser={setSelectedUserId}
            onAddDeck={handleAddDeck}
            onUpdateDeck={handleUpdateDeck}
            onToggleFeatured={handleToggleFeatured}
            onDeleteDeck={handleDeleteCommunityDeck}
            onUnpublishDeck={handleUnpublishDeck}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
      />

      <FlagDialog
        open={flagDialogOpen}
        onOpenChange={setFlagDialogOpen}
        targetType={flagItemType}
        targetId={flagItemId}
        targetName={flagItemName}
        targetDetails={flagItemDetails}
        accessToken={accessToken}
      />

      <DeletionDialog
        open={deleteDeckDialogOpen}
        onOpenChange={setDeleteDeckDialogOpen}
        targetType="deck"
        targetId={deckToDelete?.id}
        targetName={deckToDelete?.name}
        onConfirm={confirmDeleteDeck}
      />

      <DeletionDialog
        open={deleteCardDialogOpen}
        onOpenChange={setDeleteCardDialogOpen}
        targetType="card"
        targetId={cardToDelete?.id}
        targetName={cardToDelete?.name}
        onConfirm={confirmDeleteCard}
      />

      <UpdateDeckWarningDialog
        open={updateWarningOpen}
        onOpenChange={setUpdateWarningOpen}
        communityDeck={
          pendingUpdate?.communityDeck
            ? {
                id: pendingUpdate.communityDeck.id,
                name: pendingUpdate.communityDeck.name,
                emoji: pendingUpdate.communityDeck.emoji || "📚",
                color: pendingUpdate.communityDeck.color || "#10B981",
              }
            : null
        }
        importedDeck={pendingUpdate?.importedDeck || null}
        onCancel={() => {
          setUpdateWarningOpen(false);
          setPendingUpdate(null);
        }}
        onUpdate={async () => {
          if (pendingUpdate) {
            await performUpdate(
              pendingUpdate.communityDeck,
              pendingUpdate.importedDeck
            );
            setUpdateWarningOpen(false);
            setPendingUpdate(null);
          }
        }}
      />

      {/* Unpublish from Community Dialog */}
      <Dialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unpublish from Community</DialogTitle>
            <DialogDescription>
              Remove your deck from the Flashy community
            </DialogDescription>
          </DialogHeader>
          {unpublishingDeck && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{
                      backgroundColor: unpublishingDeck.color || "#10B981",
                    }}
                  >
                    {unpublishingDeck.emoji}
                  </div>
                  <div>
                    <h3 className="font-medium dark:text-gray-100">
                      {unpublishingDeck.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {unpublishingDeck.cards?.length || 0}{" "}
                      {unpublishingDeck.cards?.length === 1 ? "card" : "cards"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {unpublishingDeck.category}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {unpublishingDeck.subtopic}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will remove your deck from the community, but you can
                republish it later. Are you sure?
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setUnpublishDialogOpen(false)}
              disabled={unpublishingDeckId !== null}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUnpublish}
              disabled={unpublishingDeckId !== null}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {unpublishingDeckId !== null ? "Unpublishing..." : "Unpublish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
