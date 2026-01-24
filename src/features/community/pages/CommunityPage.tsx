import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";
// Import community-specific functions from API
import { getUserDeck } from "@/shared/api/users";
import { toast } from "sonner";
import { useIsSuperuser } from "@/shared/auth/roles";
import { AppLayout } from "@/components/Layout/AppLayout";
import { CommunityDeckGrid } from "../components/community-page/CommunityDeckGrid";
import { CommunityFilters } from "../components/community-page/CommunityFilters";
import { UserProfileView } from "../UserProfileView";
import { UserDeckViewer } from "../UserDeckViewer";
import { Pagination } from "../../../components/Pagination/Pagination";
import { UpgradeModal } from "@/components/UpgradeModal";
import { FlagDialog } from "@/features/community/components/dialogs/FlagDialog";
import { DeletionDialog } from "../components/dialogs/DeletionDialog";
import { UpdateDeckWarningDialog } from "../components/dialogs/UpdateDeckWarningDialog";
import { CommunityUserResults } from "../components/community-page/CommunityUserResults";
import { CommunityDecksSectionHeader } from "../components/community-page/CommunityDecksSectionHeader";
import { CommunityPageHeader } from "../components/community-page/CommunityPageHeader";
import { UnpublishDeckDialog } from "@/shared/components/UnpublishDeckDialog";
import { useCommunityDecks } from "../hooks/useCommunityDecks";
import { useCommunityUsersSearch } from "../hooks/useCommunityUsersSearch";
import { useCommunityViewState } from "../hooks/useCommunityViewState";
import { useCommunityActions } from "../hooks/useCommunityActions";
import { UIDeck, UICard } from "@/types/decks";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

const ITEMS_PER_PAGE = 12;
const DEFAULT_COLOR = "#10B981";
const DEFAULT_EMOJI = "📚";

const safeColor = (c: string | null | undefined) => c ?? DEFAULT_COLOR;
const safeEmoji = (e: string | null | undefined) => e ?? DEFAULT_EMOJI;

export function CommunityPage() {
  const {
    user,
    accessToken,
    decks,
    setTemporaryStudyDeck,
    setReturnToUserDeck,
    returnToCommunityDeck,
    returnToUserDeck,
    viewingCommunityDeckId,
    setViewingCommunityDeckId,
    targetCardIndex,
    viewingUserId,
    setViewingUserId,
    userProfileReturnView,
    setUserProfileReturnView,
  } = useStore();
  const {
    communityDecks,
    featuredDecks,
    loading,
    loadCommunityDecks,
    fetchDeckById,
  } = useCommunityDecks();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 150);
  const normalizedSearchQuery = useMemo(
    () => debouncedSearchQuery.trim().toLowerCase(),
    [debouncedSearchQuery],
  );

  const { searchedUsers } = useCommunityUsersSearch(debouncedSearchQuery);
  const {
    selectedUserId,
    setSelectedUserId,
    viewingUserDeck,
    setViewingUserDeck,
  } = useCommunityViewState({
    returnToCommunityDeck,
    returnToUserDeck,
    viewingCommunityDeckId,
    setViewingCommunityDeckId,
    viewingUserId,
    setViewingUserId,
    communityDecks,
    loading,
    fetchDeckById,
    targetCardIndex: targetCardIndex ?? null,
  });
  const { navigateTo } = useNavigation();
  const isSuperuser = useIsSuperuser();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSubtopic, setFilterSubtopic] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "newest">(
    "popular",
  );
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showFlashyDecksOnly, setShowFlashyDecksOnly] = useState(false);
  const [showMyPublishedOnly, setShowMyPublishedOnly] = useState(false);
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchQuery, // ✅ changed
    filterCategory,
    filterSubtopic,
    sortBy,
    showFeaturedOnly,
    showFlashyDecksOnly,
    showMyPublishedOnly,
    showUpdatesOnly,
  ]);

  const actions = useCommunityActions({
    loadCommunityDecks,
    communityDecks,
    setUpgradeModalOpen,
    setUpgradeFeature,
  });

  // Load community decks on mount
  useEffect(() => {
    void loadCommunityDecks();
  }, [loadCommunityDecks]);

  const handleViewDeckFromProfile = async (deckId: string, userId: string) => {
    try {
      if (!accessToken) {
        toast.error("Please log in to view decks");
        return;
      }

      const { deck, cards } = await getUserDeck(accessToken, userId, deckId);

      setViewingUserDeck({ deck, cards, ownerId: userId });
      setSelectedUserId(null);
    } catch (error: unknown) {
      console.error("Failed to load user deck:", error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Failed to load deck";

      toast.error(message);
    }
  };

  const filteredAndSortedDecks = useMemo(() => {
    const q = normalizedSearchQuery;

    const filtered = communityDecks.filter((deck) => {
      const name = (deck.name || "").toLowerCase();
      const cat = (deck.category || "").toLowerCase();
      const sub = (deck.subtopic || "").toLowerCase();

      const matchesSearch =
        !q || name.includes(q) || cat.includes(q) || sub.includes(q);

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

    filtered.sort((a, b) => {
      if (sortBy === "popular")
        return (b.downloadCount || 0) - (a.downloadCount || 0);

      if (sortBy === "rating") {
        const ratingA = a.averageRating || 0;
        const ratingB = b.averageRating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      }

      // newest
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }, [
    communityDecks,
    normalizedSearchQuery,
    filterCategory,
    filterSubtopic,
    sortBy,
    showFeaturedOnly,
    showFlashyDecksOnly,
    showMyPublishedOnly,
    user?.id,
  ]);

  const showingFeaturedSection = useMemo(() => {
    return (
      featuredDecks.length > 0 &&
      !normalizedSearchQuery &&
      filterCategory === "all" &&
      !showFeaturedOnly
    );
  }, [
    featuredDecks.length,
    normalizedSearchQuery,
    filterCategory,
    showFeaturedOnly,
  ]);

  const featuredDeckIds = useMemo(() => {
    return new Set(featuredDecks.map((d) => d.id));
  }, [featuredDecks]);

  const decksForGrid = useMemo(() => {
    if (!showingFeaturedSection) return filteredAndSortedDecks;
    return filteredAndSortedDecks.filter((d) => !featuredDeckIds.has(d.id));
  }, [filteredAndSortedDecks, showingFeaturedSection, featuredDeckIds]);

  const { totalPages, paginatedDecks } = useMemo(() => {
    const total = Math.ceil(decksForGrid.length / ITEMS_PER_PAGE) || 1;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      totalPages: total,
      paginatedDecks: decksForGrid.slice(start, end),
    };
  }, [decksForGrid, currentPage]);

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
  if (viewingUserDeck) {
    // Normalize deck into camel-only shape for UserDeckViewer
    const viewerDeck = {
      ...viewingUserDeck.deck,

      // force required UI fields to be non-null
      id: viewingUserDeck.deck.id,
      ownerId: viewingUserDeck.ownerId,
      cardCount: viewingUserDeck.cards.length,
      createdAt: viewingUserDeck.deck.createdAt ?? new Date().toISOString(),
      updatedAt: viewingUserDeck.deck.updatedAt ?? new Date().toISOString(),

      // UI-only
      isPublic: viewingUserDeck.deck.isPublished ?? false,
      emoji: safeEmoji(viewingUserDeck.deck.emoji),
      color: safeColor(viewingUserDeck.deck.color),
    };

    const viewerCards = viewingUserDeck.cards.map((card) => ({
      ...card,
      front: card.front ?? "",
      back: card.back ?? "",
    }));

    return (
      <UserDeckViewer
        deck={viewerDeck}
        cards={viewerCards}
        ownerId={viewingUserDeck.ownerId}
        isOwner={user?.id === viewingUserDeck.ownerId}
        onBack={() => {
          setSelectedUserId(viewingUserDeck.ownerId);
          setViewingUserDeck(null);
          setReturnToUserDeck(null);
        }}
        onStudy={(deck, cards) => {
          // Build study cards that satisfy UICard exactly (no optional booleans)
          const mappedCards: UICard[] = cards.map((card, index) => ({
            id: card.id,
            front: card.front ?? "",
            back: card.back ?? "",
            cardType: card.cardType,
            correctAnswers: card.correctAnswers ?? null,
            incorrectAnswers: card.incorrectAnswers ?? null,
            acceptedAnswers: card.acceptedAnswers ?? null,
            audioUrl: card.audioUrl ?? null,
            frontImageUrl: card.frontImageUrl ?? null,
            backImageUrl: card.backImageUrl ?? null,
            frontAudio: card.frontAudio ?? null,
            backAudio: card.backAudio ?? null,
            position: card.position ?? index,

            // REQUIRED booleans
            favorite: false,
            isIgnored: false,

            // required by your app card type
            deckId: deck.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          // Build study deck (UIDeck)
          const studyDeck: UIDeck = {
            id: deck.id,
            name: deck.name,
            color: safeColor(deck.color),
            emoji: safeEmoji(deck.emoji),
            cardCount: mappedCards.length,
            category: deck.category ?? "",
            subtopic: deck.subtopic ?? "",
            userId: user?.id ?? "",
            isPublic: false,
            isPublished: false,
            difficulty: deck.difficulty ?? "beginner",

            createdAt: deck.createdAt ?? new Date().toISOString(),
            updatedAt: deck.updatedAt ?? new Date().toISOString(),

            frontLanguage: deck.frontLanguage ?? null,
            backLanguage: deck.backLanguage ?? null,
          };

          setTemporaryStudyDeck({
            deck: studyDeck,
            cards: mappedCards,
          });

          setReturnToUserDeck(viewingUserDeck);
          navigateTo("study");
        }}
      />
    );
  }
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
            <CommunityPageHeader
              user={user}
              decks={decks}
              actions={actions}
              setUpgradeFeature={setUpgradeFeature}
              setUpgradeModalOpen={setUpgradeModalOpen}
            />

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
          <CommunityUserResults
            users={searchedUsers}
            onSelectUser={setSelectedUserId}
          />

          {/* Decks Section Header */}
          <CommunityDecksSectionHeader show={!!normalizedSearchQuery} />

          {/* Decks Grid */}
          <CommunityDeckGrid
            decks={paginatedDecks}
            featuredDecks={featuredDecks}
            showFeaturedSection={showingFeaturedSection}
            showFeaturedOnly={showFeaturedOnly}
            showUpdatesOnly={showUpdatesOnly}
            searchQuery={debouncedSearchQuery}
            filterCategory={filterCategory}
            userDecks={decks}
            userId={user?.id || null}
            isSuperuser={isSuperuser}
            addingDeckId={actions.addingDeckId}
            deletingDeckId={actions.deletingDeckId}
            featuringDeckId={actions.featuringDeckId}
            unpublishingDeckId={actions.unpublishingDeckId}
            onViewDeck={(deck) =>
              navigateTo("community-deck-detail", { deckId: deck.id })
            }
            onViewUser={setSelectedUserId}
            onAddDeck={actions.handleAddDeck}
            onUpdateDeck={actions.handleUpdateDeck}
            onToggleFeatured={actions.handleToggleFeatured}
            onDeleteDeck={actions.handleDeleteCommunityDeck}
            onUnpublishDeck={actions.handleUnpublishDeck}
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
        open={actions.flagDialogOpen}
        onOpenChange={actions.setFlagDialogOpen}
        targetType={actions.flagItemType}
        targetId={actions.flagItemId}
        targetName={actions.flagItemName}
        targetDetails={actions.flagItemDetails}
        accessToken={accessToken}
      />

      <DeletionDialog
        open={actions.deleteDeckDialogOpen}
        onOpenChange={actions.setDeleteDeckDialogOpen}
        targetType="deck"
        targetId={actions.deckToDelete?.id}
        targetName={actions.deckToDelete?.name}
        onConfirm={actions.confirmDeleteDeck}
      />

      <DeletionDialog
        open={actions.deleteCardDialogOpen}
        onOpenChange={actions.setDeleteCardDialogOpen}
        targetType="card"
        targetId={actions.cardToDelete?.id}
        targetName={actions.cardToDelete?.name}
        onConfirm={actions.confirmDeleteCard}
      />

      <UpdateDeckWarningDialog
        open={actions.updateWarningOpen}
        onOpenChange={actions.setUpdateWarningOpen}
        communityDeck={
          actions.pendingUpdate?.communityDeck
            ? {
                id: actions.pendingUpdate.communityDeck.id,
                name: actions.pendingUpdate.communityDeck.name,
                emoji: actions.pendingUpdate.communityDeck.emoji || "📚",
                color: actions.pendingUpdate.communityDeck.color || "#10B981",
                cardsCount: actions.pendingUpdate.communityDeck.cardCount || 0,
              }
            : null
        }
        importedDeck={actions.pendingUpdate?.importedDeck || null}
        onCancel={() => {
          actions.setUpdateWarningOpen(false);
          actions.setPendingUpdate(null);
        }}
        onUpdate={async () => {
          if (actions.pendingUpdate) {
            await actions.performUpdate(
              actions.pendingUpdate.communityDeck,
              actions.pendingUpdate.importedDeck,
            );
            actions.setUpdateWarningOpen(false);
            actions.setPendingUpdate(null);
          }
        }}
      />

      {/* Unpublish from Community Dialog */}
      <UnpublishDeckDialog
        open={actions.unpublishDialogOpen}
        onOpenChange={actions.setUnpublishDialogOpen}
        deck={
          actions.unpublishingDeck
            ? {
                name: actions.unpublishingDeck.name,
                emoji: actions.unpublishingDeck.emoji,
                color: actions.unpublishingDeck.color,
                cardsLength: actions.unpublishingDeck.cards?.length ?? null,
                cardCount: actions.unpublishingDeck.cardCount ?? null,
                category: actions.unpublishingDeck.category ?? null,
                subtopic: actions.unpublishingDeck.subtopic ?? null,
              }
            : null
        }
        isLoading={actions.unpublishingDeckId !== null}
        onConfirm={actions.confirmUnpublish}
      />
    </AppLayout>
  );
}
