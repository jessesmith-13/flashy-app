import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";
// Import community-specific functions from API
import { getUserDeck } from "@/shared/api/users";
import { toast } from "sonner";
import { canPublishToCommunity } from "@/shared/entitlements/subscription";
import { useIsSuperuser } from "@/shared/auth/roles";
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
import { CommunityDeckGrid } from "../CommunityDeckGrid";
import { CommunityFilters } from "../CommunityFilters";
import { UserProfileView } from "../UserProfileView";
import { UserDeckViewer } from "../UserDeckViewer";
import { Pagination } from "../../../components/Pagination/Pagination";
import { UpgradeModal } from "@/components/UpgradeModal";
import { FlagDialog } from "../FlagDialog";
import { DeletionDialog } from "../DeletionDialog";
import { UpdateDeckWarningDialog } from "../UpdateDeckWarningDialog";
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
          // Build study deck (UIDeck)
          const studyDeck: UIDeck = {
            id: deck.id,
            name: deck.name,
            color: safeColor(deck.color),
            emoji: safeEmoji(deck.emoji),
            cardCount: mappedCards.length,
            category: deck.category ?? "",
            subtopic: deck.subtopic ?? "",

            // ✅ required by UIDeck
            userId: user?.id ?? "", // or viewingUserDeck.ownerId if that's what UIDeck expects
            isPublic: false,
            isPublished: false,
            difficulty: deck.difficulty ?? "beginner", // adjust to your union if needed

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
                open={actions.publishDialogOpen}
                onOpenChange={actions.setPublishDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10"
                    onClick={(e) => {
                      if (
                        !canPublishToCommunity(
                          user?.subscriptionTier,
                          user?.isSuperuser,
                          user?.isModerator,
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
                        value={actions.selectedDeckId}
                        onValueChange={actions.setSelectedDeckId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a deck..." />
                        </SelectTrigger>
                        <SelectContent>
                          {actions.publishableDecks.map((deck) => (
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
                          {actions.publishableDecks.length === 0 && (
                            <div className="px-2 py-1 text-sm text-gray-500">
                              No decks available to publish. Create a deck with
                              10+ cards and set its category.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {actions.selectedDeckId &&
                      (() => {
                        const selectedDeck = decks.find(
                          (d) => d.id === actions.selectedDeckId,
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
                      onClick={actions.handlePublishDeck}
                      disabled={actions.publishing || !actions.selectedDeckId}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {actions.publishing
                        ? "Publishing..."
                        : (() => {
                            const selectedDeck = decks.find(
                              (d) => d.id === actions.selectedDeckId,
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
              {searchedUsers.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Users
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {searchedUsers.length}{" "}
                    {searchedUsers.length === 1 ? "user" : "users"} found
                  </span>
                </div>
              )}
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
          {normalizedSearchQuery && (
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
      <Dialog
        open={actions.unpublishDialogOpen}
        onOpenChange={actions.setUnpublishDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unpublish from Community</DialogTitle>
            <DialogDescription>
              Remove your deck from the Flashy community
            </DialogDescription>
          </DialogHeader>

          {actions.unpublishingDeck && (
            <div className="space-y-4 py-4">
              ...
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: actions.unpublishingDeck.color || "#10B981",
                }}
              >
                {actions.unpublishingDeck.emoji}
              </div>
              ...
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => actions.setUnpublishDialogOpen(false)}
              disabled={actions.unpublishingDeckId !== null}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              onClick={actions.confirmUnpublish}
              disabled={actions.unpublishingDeckId !== null}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {actions.unpublishingDeckId !== null
                ? "Unpublishing..."
                : "Unpublish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
