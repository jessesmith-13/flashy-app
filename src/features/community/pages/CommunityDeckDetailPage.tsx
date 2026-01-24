import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/state/useStore";
import { useIsSuperuser } from "@/shared/auth/roles";

import {
  ArrowLeft,
  Star,
  Users,
  Plus,
  Flag,
  X,
  Check,
  Upload,
} from "lucide-react";

import { DeckRatingDisplay } from "../DeckRatingDisplay";
import { DeckRating } from "../DeckRating";
import { DeckComments } from "../DeckComments";
import { DeckCardPreviewList } from "../DeckCardPreviewList";

import { FlagDialog } from "../FlagDialog";
import { DeletionDialog } from "../DeletionDialog";
import { UpdateDeckWarningDialog } from "../UpdateDeckWarningDialog";

import { useCommunityDecks } from "../hooks/useCommunityDecks";
import { useCommunityActions } from "../hooks/useCommunityActions";
import { useCommunityStudyNavigation } from "../hooks/useCommunityStudyNavigation";

import type { UIDeck } from "@/types/decks";
import type { UICommunityDeck } from "@/types/community";

const CARDS_PER_PAGE = 20;

export function CommunityDeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const {
    accessToken,
    decks,
    targetCommentId,
    targetCardIndex,
    setTargetCommentId,
    setTargetCardIndex,
  } = useStore();

  const isSuperuser = useIsSuperuser();
  const { communityDecks, loadCommunityDecks } = useCommunityDecks();
  const { studyCommunityDeck } = useCommunityStudyNavigation();

  const [deck, setDeck] = useState<UICommunityDeck | null>(null);
  const [deckDetailPage, setDeckDetailPage] = useState(1);

  const openUpgrade = (feature?: string) => {
    navigate("/upgrade", { state: { feature } }); // optional feature
  };

  const actions = useCommunityActions({
    loadCommunityDecks,
    communityDecks,
    setUpgradeModalOpen: (open) => {
      if (open) openUpgrade(); // only care about opening
    },
    setUpgradeFeature: (f) => {
      if (f) openUpgrade(f);
    },
    setViewingDeck: setDeck,
    viewingDeck: deck,
  });

  useEffect(() => {
    if (!deckId) {
      navigate("/community");
      return;
    }

    let cancelled = false;

    (async () => {
      if (communityDecks.length === 0) await loadCommunityDecks();
      const loaded = await actions.loadDeckById(deckId);

      if (cancelled) return;

      if (!loaded) {
        toast.error("Deck not found");
        navigate("/community");
        return;
      }
      setDeck(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [deckId, communityDecks.length, loadCommunityDecks, actions, navigate]);

  const importedDeck = useMemo(() => {
    if (!deck) return undefined;
    return decks.find(
      (d) => d.sourceCommunityDeckId === deck.id && !d.isDeleted,
    );
  }, [decks, deck]);

  const isAdded = !!importedDeck;

  const updateAvailable = useMemo(() => {
    if (!deck || !importedDeck) return false;
    return (deck.version || 1) > (importedDeck.importedFromVersion || 1);
  }, [deck, importedDeck]);

  const hasCards = !!(deck?.cardCount && deck.cardCount > 0);

  // keep your highlight navigation behavior
  const hasNavigatedToCard = useRef(false);
  const hasNavigatedToComment = useRef(false);

  useEffect(() => {
    if (!deck) return;
    if (targetCardIndex !== null && hasCards && !hasNavigatedToCard.current) {
      const targetPage =
        Math.floor((targetCardIndex ?? 0) / CARDS_PER_PAGE) + 1;

      setDeckDetailPage(targetPage);
      hasNavigatedToCard.current = true;

      setTimeout(() => {
        setTargetCardIndex(null);
        hasNavigatedToCard.current = false;
      }, 2000);
    }
  }, [deck, targetCardIndex, hasCards, setTargetCardIndex]);

  useEffect(() => {
    if (targetCommentId && !hasNavigatedToComment.current) {
      hasNavigatedToComment.current = true;
      setTimeout(() => {
        setTargetCommentId(null);
        hasNavigatedToComment.current = false;
      }, 3000);
    }
  }, [targetCommentId, setTargetCommentId]);

  const onBack = () => {
    setTargetCommentId(null);
    setTargetCardIndex(null);
    navigate("/community");
  };

  const getDifficultyEmoji = (difficulty?: string): string => {
    switch (difficulty) {
      case "beginner":
        return "🟢";
      case "intermediate":
        return "🟡";
      case "advanced":
        return "🟠";
      case "expert":
        return "🔴";
      default:
        return "🌈";
    }
  };

  const getDifficultyLabel = (difficulty?: string): string => {
    if (!difficulty) return "";
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  const getDifficultyClassName = (difficulty?: string): string => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "intermediate":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
      case "advanced":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
      case "expert":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default:
        return "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400";
    }
  };

  if (!deck) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">
            Loading deck...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0"
                  style={{ backgroundColor: deck.color || undefined }}
                >
                  {deck.emoji}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 mb-1 flex-wrap">
                    <h1 className="text-xl sm:text-2xl truncate dark:text-gray-100 flex-1 min-w-0">
                      {deck.name}
                    </h1>

                    {deck.featured && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-700 flex-shrink-0">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </span>
                    )}

                    {actions.flaggedDecks.has(deck.id) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700 flex-shrink-0">
                        <Flag className="w-3 h-3 mr-1" />
                        Marked for Review
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <button
                      onClick={() =>
                        navigate(`/community/user/${deck.ownerId}`)
                      }
                      className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      <span>by {deck.ownerDisplayName}</span>
                    </button>

                    <DeckRatingDisplay deckId={deck.id} />

                    <div className="flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      <span>{deck.downloadCount} downloads</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {deck.publishedAt && (
                      <div className="flex items-center gap-1">
                        <span>
                          Created:{" "}
                          {new Date(deck.publishedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    )}
                    {deck.updatedAt && (
                      <div className="flex items-center gap-1">
                        <span>
                          Last updated:{" "}
                          {new Date(deck.updatedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                {isSuperuser && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => actions.handleToggleFeatured(deck.id)}
                      disabled={actions.featuringDeckId === deck.id}
                      className="border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 h-9 sm:h-10"
                    >
                      <Star
                        className={`w-4 h-4 mr-2 ${deck.featured ? "fill-current" : ""}`}
                      />
                      {actions.featuringDeckId === deck.id
                        ? "Updating..."
                        : deck.featured
                          ? "Unfeature"
                          : "Feature"}
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        actions.handleDeleteCommunityDeck(deck.id, deck.name)
                      }
                      disabled={actions.deletingDeckId === deck.id}
                      className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 h-9 sm:h-10 w-9 sm:w-10"
                      title="Delete this deck"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    actions.openFlagDialog("deck", deck.id, deck.name)
                  }
                  className="border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 h-9 sm:h-10 w-9 sm:w-10"
                  title="Report this deck"
                >
                  <Flag className="w-4 h-4" />
                </Button>

                <Button
                  onClick={() => {
                    if (!hasCards) {
                      toast.error("This deck has no cards to study");
                      return;
                    }
                    studyCommunityDeck(deck);
                  }}
                  disabled={!hasCards}
                  variant="outline"
                  className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-1 sm:flex-initial text-sm sm:text-base h-9 sm:h-10"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Study Now
                </Button>

                {updateAvailable && importedDeck ? (
                  <Button
                    onClick={() =>
                      actions.handleUpdateDeck(deck, importedDeck as UIDeck)
                    }
                    disabled={actions.addingDeckId === deck.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-initial text-sm sm:text-base h-9 sm:h-10 relative"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {actions.addingDeckId === deck.id
                      ? "Updating..."
                      : "Update Available"}
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (isAdded)
                        toast.info("You have already added this deck");
                      else actions.handleAddDeck(deck);
                    }}
                    disabled={actions.addingDeckId === deck.id}
                    className={`${
                      isAdded
                        ? "bg-gray-400 hover:bg-gray-500"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    } text-white flex-1 sm:flex-initial text-sm sm:text-base h-9 sm:h-10`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Already Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {actions.addingDeckId === deck.id
                          ? "Adding..."
                          : "Add to My Decks"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
              {deck.category && (
                <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  {deck.category}
                </span>
              )}
              {deck.subtopic && (
                <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  {deck.subtopic}
                </span>
              )}
              {deck.difficulty && (
                <span
                  className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm ${getDifficultyClassName(
                    deck.difficulty,
                  )}`}
                >
                  {getDifficultyEmoji(deck.difficulty)}{" "}
                  {getDifficultyLabel(deck.difficulty)}
                </span>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mb-0">
              {deck.cardCount || 0}{" "}
              {(deck.cardCount || 0) === 1 ? "card" : "cards"} in this deck
            </p>
          </div>

          <DeckCardPreviewList
            cards={(deck.cards || []).map((c) => ({
              ...c,
              favorite: c.favorite ?? false,
              isIgnored: c.isIgnored ?? false,
              deckId: c.deckId ?? deck.id, // ensure required string
            }))}
            deckId={deck.id}
            currentPage={deckDetailPage}
            cardsPerPage={CARDS_PER_PAGE}
            flaggedCards={actions.flaggedCards}
            targetCardIndex={targetCardIndex}
            isSuperuser={isSuperuser}
            onPageChange={setDeckDetailPage}
            onFlagCard={(cardId, cardName) =>
              actions.openFlagDialog("card", cardId, cardName, deck.id)
            }
            onDeleteCard={(cardId, cardName) =>
              actions.handleDeleteCard(cardId, cardName, deck.id)
            }
          />

          <div className="mb-4 sm:mb-6">
            <DeckRating deckId={deck.id} onRatingChange={loadCommunityDecks} />
          </div>

          <DeckComments
            deckId={deck.id}
            deckAuthorId={deck.ownerId}
            targetCommentId={targetCommentId}
            onViewUser={(userId) => navigate(`/community/user/${userId}`)}
            onFlagComment={(commentId, commentText) =>
              actions.openFlagDialog("comment", commentId, commentText, deck.id)
            }
          />
        </div>
      </div>

      {/* Global dialogs from actions */}
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
    </AppLayout>
  );
}
