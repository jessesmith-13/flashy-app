import { Star, RefreshCw } from "lucide-react";
import { CommunityDeckCard } from "./CommunityDeckCard";
import { UIDeck } from "@/types/decks";
import { UICommunityDeck } from "@/types/community";

interface CommunityDeckGridProps {
  decks: UICommunityDeck[];
  featuredDecks: UICommunityDeck[];
  showFeaturedSection: boolean;
  showFeaturedOnly: boolean;
  showUpdatesOnly: boolean;
  searchQuery: string;
  filterCategory: string;
  userDecks: UIDeck[];
  userId: string | null;
  isSuperuser: boolean;
  addingDeckId: string | null;
  deletingDeckId: string | null;
  featuringDeckId: string | null;
  unpublishingDeckId: string | null;
  onViewDeck: (deck: UICommunityDeck) => void;
  onViewUser: (userId: string) => void;
  onAddDeck: (deck: UICommunityDeck) => void;
  onUpdateDeck: (communityDeck: UICommunityDeck, importedDeck: UIDeck) => void;
  onToggleFeatured: (deckId: string) => void;
  onDeleteDeck: (deckId: string, deckName: string) => void;
  onUnpublishDeck: (deckId: string, deckName: string) => void;
}

export function CommunityDeckGrid({
  decks,
  featuredDecks,
  showFeaturedSection,
  showFeaturedOnly,
  showUpdatesOnly,
  searchQuery,
  filterCategory,
  userDecks,
  userId,
  isSuperuser,
  addingDeckId,
  deletingDeckId,
  featuringDeckId,
  unpublishingDeckId,
  onViewDeck,
  onViewUser,
  onAddDeck,
  onUpdateDeck,
  onToggleFeatured,
  onDeleteDeck,
  onUnpublishDeck,
}: CommunityDeckGridProps) {
  const renderDeckCard = (deck: UICommunityDeck, isFeatured: boolean) => {
    const importedDeck = userDecks.find(
      (d) => d.sourceCommunityDeckId === deck.id,
    );
    const ownDeck = userDecks.find((d) => d.id === deck.originalDeckId);
    const isOwnDeck = deck.ownerId === userId;

    // Is it currently in your decks (not deleted)?
    const isAdded = !!(
      (importedDeck && !importedDeck.isDeleted) ||
      (isOwnDeck && ownDeck && !ownDeck.isDeleted)
    );

    // Did you delete your own published deck?
    const isDeleted = ownDeck?.isDeleted || false;

    const updateAvailable =
      importedDeck && deck.sourceContentUpdatedAt && importedDeck.lastSyncedAt
        ? new Date(deck.sourceContentUpdatedAt).getTime() >
          new Date(importedDeck.lastSyncedAt).getTime()
        : false;

    console.log("🔍 Update check:", {
      deckName: deck.name,
      sourceContentUpdatedAt: deck.sourceContentUpdatedAt,
      lastSyncedAt: importedDeck?.lastSyncedAt,
      updateAvailable,
    });

    return (
      <CommunityDeckCard
        key={deck.id}
        deck={deck}
        isAdded={isAdded}
        isDeleted={isDeleted}
        updateAvailable={updateAvailable}
        isSuperuser={isSuperuser}
        isOwnDeck={isOwnDeck}
        addingDeckId={addingDeckId}
        deletingDeckId={deletingDeckId}
        featuringDeckId={featuringDeckId}
        unpublishingDeckId={unpublishingDeckId}
        onViewDeck={onViewDeck}
        onViewUser={onViewUser}
        onAddDeck={onAddDeck}
        onUpdateDeck={onUpdateDeck}
        onToggleFeatured={onToggleFeatured}
        onDeleteDeck={onDeleteDeck}
        onUnpublishDeck={onUnpublishDeck}
        importedDeck={importedDeck}
        isFeatured={isFeatured}
      />
    );
  };

  // Filter decks based on update availability
  const getFilteredDecks = (deckList: UICommunityDeck[]) => {
    if (!showUpdatesOnly) return deckList;

    return deckList.filter((deck) => {
      const importedDeck = userDecks.find(
        (d) => d.sourceCommunityDeckId === deck.id,
      );
      const updateAvailable =
        importedDeck && deck.sourceContentUpdatedAt && importedDeck.lastSyncedAt
          ? new Date(deck.sourceContentUpdatedAt).getTime() >
            new Date(importedDeck.lastSyncedAt).getTime()
          : false;
      return updateAvailable;
    });
  };

  const filteredDecks = getFilteredDecks(decks);
  const filteredFeaturedDecks = getFilteredDecks(featuredDecks);

  // Count decks with updates available
  const updatesCount = decks.filter((deck) => {
    const importedDeck = userDecks.find(
      (d) => d.sourceCommunityDeckId === deck.id,
    );
    return importedDeck &&
      deck.sourceContentUpdatedAt &&
      importedDeck.lastSyncedAt
      ? new Date(deck.sourceContentUpdatedAt).getTime() >
          new Date(importedDeck.lastSyncedAt).getTime()
      : false;
  }).length;

  return (
    <>
      {/* Featured Decks Section - Only show when no active search/filters and not in featured-only mode */}
      {showFeaturedSection && !showUpdatesOnly && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-purple-600 dark:text-purple-400 fill-current" />
            <h2 className="text-xl sm:text-2xl text-gray-900 dark:text-gray-100">
              Featured Decks
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredFeaturedDecks.map((deck) => renderDeckCard(deck, true))}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mb-6" />
        </div>
      )}

      {/* Section Headers */}
      {showFeaturedOnly && !showUpdatesOnly && (
        <div className="mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-purple-600 dark:text-purple-400 fill-current" />
          <h2 className="text-xl text-gray-900 dark:text-gray-100">
            Featured Decks
          </h2>
        </div>
      )}
      {showUpdatesOnly && (
        <div className="mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl text-gray-900 dark:text-gray-100">
            Updates Available
            {updatesCount > 0 && (
              <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                {updatesCount}
              </span>
            )}
          </h2>
        </div>
      )}
      {!showFeaturedOnly &&
        !showUpdatesOnly &&
        featuredDecks.length > 0 &&
        !searchQuery &&
        filterCategory === "all" && (
          <div className="mb-4">
            <h2 className="text-xl text-gray-900 dark:text-gray-100">
              All Community Decks
            </h2>
          </div>
        )}
      {!showFeaturedOnly &&
        !showUpdatesOnly &&
        (searchQuery || filterCategory !== "all") && (
          <div className="mb-4">
            <h2 className="text-xl text-gray-900 dark:text-gray-100">
              Search Results
            </h2>
          </div>
        )}

      {/* Decks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDecks.map((deck) => renderDeckCard(deck, false))}
      </div>

      {filteredDecks.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <p className="text-gray-600 dark:text-gray-400">
            {showUpdatesOnly
              ? "No deck updates available"
              : showFeaturedOnly
                ? "No featured decks available"
                : "No decks found matching your search"}
          </p>
        </div>
      )}
    </>
  );
}
