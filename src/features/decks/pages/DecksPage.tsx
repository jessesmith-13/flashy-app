import { useState } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Pagination } from "@/components/Pagination/Pagination";
import { ShareDeckDialog } from "@/components/ShareDeckDialog";
import { UpgradeModal } from "@/components/UpgradeModal";
import { DecksEmptyState } from "../components/decks-page/DecksEmptyState";
import { DecksGrid } from "../components/decks-page/DecksGrid";

import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";
import { useIsSuperuser } from "@/shared/auth/roles";
import type {
  DecksTab,
  SortOption,
  UIDeck,
  DifficultyLevel,
} from "@/types/decks";
import type { StudySession } from "@/types/study";
import { useDecksBootstrap } from "../hooks/useDecksBootstrap";
import { useDecksFilters } from "../hooks/useDecksFilters";
import { useDecksActions } from "../hooks/useDecksActions";

import { DecksHeader } from "../components/decks-page/DecksHeader";
import { DecksFiltersBar } from "../components/decks-page/DecksFiltersBar";
import { EditDeckDialog } from "../components/shared/EditDeckDialog";
import { PublishDeckDialog } from "../components/shared/PublishDeckDialog";
import { UnpublishDeckDialog } from "../components/shared/UnpublishDeckDialog";

export function DecksPage() {
  const { user, accessToken, decks, setSelectedDeckId, studySessions } =
    useStore();
  const { navigateTo, navigate } = useNavigation();
  const isSuperuser = useIsSuperuser();

  // dialogs / UI state that belongs to the page
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<UIDeck | null>(null);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingDeck, setSharingDeck] = useState<UIDeck | null>(null);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishingDeck, setPublishingDeck] = useState<UIDeck | null>(null);

  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [unpublishingDeck, setUnpublishingDeck] = useState<UIDeck | null>(null);

  const [activeTab, setActiveTab] = useState<DecksTab>("all");
  const [sortOption, setSortOption] = useState<SortOption>("custom");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSubtopic, setFilterSubtopic] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // bootstrap
  const { loading } = useDecksBootstrap();

  // actions
  const actions = useDecksActions();

  // filters
  const { counts, paginatedDecks, sortedDecks, totalPages } = useDecksFilters({
    decks,
    activeTab,
    sortOption,
    searchQuery,
    filterCategory,
    filterSubtopic,
    studySessions: (studySessions ?? []) as StudySession[],
    currentPage,
    setCurrentPage,
    perPage: ITEMS_PER_PAGE,
  });

  const isFree = user?.subscriptionTier === "free";

  const onDeckClick = (deckId: string) => {
    setSelectedDeckId(deckId);
    navigate(`/deck-detail/${deckId}`);
  };

  // ✅ match: (deck, e)
  const onOpenEdit = (deck: UIDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDeck(deck);
    setEditDialogOpen(true);
  };

  // ✅ match: (deck, e)
  const onOpenPublish = (deck: UIDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setPublishingDeck(deck);
    setPublishDialogOpen(true);
  };

  // ✅ match: (deck, e)
  const onOpenUnpublish = (deck: UIDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnpublishingDeck(deck);
    setUnpublishDialogOpen(true);
  };

  // ✅ match: (deck, e)
  const onShare = (deck: UIDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingDeck(deck);
    setShareDialogOpen(true);
  };

  return (
    <AppLayout>
      {loading ? (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">
            Loading My Flashcards...
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-3 pt-5 pb-3 sm:px-6 sm:pt-6 lg:p-8 overflow-x-hidden">
          <DecksHeader
            isFree={!!isFree}
            onUpgrade={() => navigateTo("upgrade")}
            onCreateClick={() =>
              actions.onCreateDeckClick(
                () => setCreateDialogOpen(true),
                isSuperuser,
              )
            }
            createDialogOpen={createDialogOpen}
            setCreateDialogOpen={setCreateDialogOpen}
            onCreateDeck={(data) =>
              actions.onCreateDeck({
                ...data,
                difficulty: (data.difficulty && data.difficulty !== ""
                  ? data.difficulty
                  : undefined) as DifficultyLevel | undefined,
              })
            }
          />

          <EditDeckDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            deck={editingDeck}
            onUpdateDeck={(data) => {
              if (!editingDeck) return Promise.resolve();

              return actions
                .onUpdateDeck(editingDeck, {
                  ...data,
                  difficulty: (data.difficulty && data.difficulty !== ""
                    ? data.difficulty
                    : undefined) as DifficultyLevel | undefined,
                })
                .then(() => {
                  setEditDialogOpen(false);
                  setEditingDeck(null);
                });
            }}
          />

          <DecksFiltersBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filterSubtopic={filterSubtopic}
            setFilterSubtopic={setFilterSubtopic}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sortOption={sortOption}
            setSortOption={setSortOption}
            counts={counts}
          />

          {sortedDecks.length === 0 ? (
            <DecksEmptyState
              activeTab={activeTab}
              searchQuery={searchQuery}
              filterCategory={filterCategory}
              filterSubtopic={filterSubtopic}
              onClearFilters={() => {
                setFilterCategory("all");
                setFilterSubtopic("all");
              }}
            />
          ) : (
            <>
              <DecksGrid
                decks={paginatedDecks}
                sortOption={sortOption}
                userId={user?.id}
                favoritePendingById={(deckId) =>
                  actions.isTogglePending(deckId, "favorite")
                }
                learnedPendingById={(deckId) =>
                  actions.isTogglePending(deckId, "learned")
                }
                onDeckClick={onDeckClick}
                onDragStart={actions.onDragStart}
                onDragOver={actions.onDragOver}
                onDrop={actions.onDrop}
                onToggleFavorite={actions.onToggleFavorite}
                onToggleLearned={actions.onToggleLearned}
                onEdit={onOpenEdit}
                onDelete={actions.onDeleteDeck}
                deletingDeckId={actions.deletingDeckId}
                onOpenPublish={onOpenPublish}
                onOpenUnpublish={onOpenUnpublish}
                onShare={onShare}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}

          <ShareDeckDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            deckId={sharingDeck?.id || ""}
            deckName={sharingDeck?.name || ""}
            isCommunityDeck={false}
            accessToken={accessToken}
          />

          {publishingDeck && (
            <PublishDeckDialog
              open={publishDialogOpen}
              onOpenChange={(open) => {
                setPublishDialogOpen(open);
                if (!open) setPublishingDeck(null);
              }}
              deck={publishingDeck}
              cardCount={publishingDeck.cardCount ?? 0}
              publishing={actions.publishing}
              onPublish={async () => {
                await actions.publish(publishingDeck);
                setPublishDialogOpen(false);
                setPublishingDeck(null);
              }}
              onOpenSettings={() => {
                setEditingDeck(publishingDeck);
                setEditDialogOpen(true);
              }}
            />
          )}

          <UnpublishDeckDialog
            open={unpublishDialogOpen}
            onOpenChange={(open) => {
              setUnpublishDialogOpen(open);
              if (!open) setUnpublishingDeck(null);
            }}
            deck={unpublishingDeck}
            isLoading={actions.unpublishingDeckId !== null}
            onConfirm={async () => {
              if (!unpublishingDeck) return;
              await actions.unpublish(unpublishingDeck);
              setUnpublishDialogOpen(false);
              setUnpublishingDeck(null);
            }}
          />

          <UpgradeModal
            open={actions.upgradeModalOpen}
            onOpenChange={actions.setUpgradeModalOpen}
            feature={actions.upgradeFeature}
          />
        </div>
      )}
    </AppLayout>
  );
}
