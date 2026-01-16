import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/button";
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
import { DeckRatingDisplay } from "./DeckRatingDisplay";
import { DeckRating } from "./DeckRating";
import { DeckComments } from "./DeckComments";
import { DeckCardPreviewList } from "./DeckCardPreviewList";
import { AppLayout } from "@/components/Layout/AppLayout";
import { FlagDialog } from "./FlagDialog";
import { DeletionDialog } from "./DeletionDialog";
import { toast } from "sonner";
import { useStore } from "@/shared/state/useStore";
import {
  deleteCommunityDeck,
  deleteCommunityCard,
} from "../../shared/api/admin";
import { UIDeck } from "@/types/decks";
import { UICommunityDeck, UICommunityCard } from "@/types/community";
import { UICard } from "@/types/decks";

type FlagTargetType = "deck" | "comment" | "card";

interface FlagTargetDetails {
  deckId?: string;
  commentText?: string;
  front?: string;
}

interface FlagTarget {
  type: FlagTargetType;
  id: string;
  name: string;
  details?: FlagTargetDetails;
}

interface CardToDelete {
  id: string;
  name: string;
  deckId: string;
}

interface CommunityDeckDetailProps {
  cards: UICard[] | UICommunityCard[]; // ✅ Accept both types
  deck: UICommunityDeck;
  userDecks: UIDeck[];
  isSuperuser: boolean;
  addingDeckId: string | null;
  deletingDeckId: string | null;
  featuringDeckId: string | null;
  deckDetailPage: number;
  cardsPerPage: number;
  flaggedDecks: Set<string>;
  flaggedCards: Set<string>;
  targetCommentId?: string | null;
  targetCardIndex?: number | null;
  onBack: () => void;
  onViewUser: (userId: string) => void;
  onAddDeck: (deck: UICommunityDeck) => void;
  onUpdateDeck: (communityDeck: UICommunityDeck, importedDeck: UIDeck) => void;
  onToggleFeatured: (deckId: string) => void;
  onDeleteDeck: (deckId: string, deckName: string) => void;
  onDeleteCard?: (cardId: string, cardName: string, deckId: string) => void;
  onFlagDeck: (deckId: string, deckName: string) => void;
  onFlagCard: (cardId: string, cardName: string) => void;
  onFlagComment: (
    commentId: string,
    commentText: string,
    deckId: string
  ) => void;
  onFlagUser: (userId: string, userName: string) => void;
  onStudyDeck: (deck: UICommunityDeck) => void;
  onDeckDetailPageChange: (page: number) => void;
  onRatingChange: () => void;
}

export function CommunityDeckDetail({
  deck,
  userDecks,
  isSuperuser,
  addingDeckId,
  deletingDeckId,
  featuringDeckId,
  deckDetailPage,
  cardsPerPage,
  flaggedDecks,
  flaggedCards,
  targetCommentId,
  targetCardIndex,
  onBack,
  onViewUser,
  onAddDeck,
  onUpdateDeck,
  onToggleFeatured,
  onStudyDeck,
  onDeckDetailPageChange,
  onRatingChange,
}: CommunityDeckDetailProps) {
  const { accessToken, setTargetCardIndex, setTargetCommentId } = useStore();
  const importedDeck = userDecks.find(
    (d) => d.sourceCommunityDeckId === deck.id && !d.isDeleted
  );
  const isAdded = !!importedDeck;
  const updateAvailable =
    importedDeck &&
    (deck.version || 1) > (importedDeck.importedFromVersion || 1);
  const hasCards = deck.cardCount && deck.cardCount > 0;

  // Local flag dialog state
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagTarget, setFlagTarget] = useState<FlagTarget | null>(null);

  // Local deletion dialog state
  const [deleteDeckDialogOpen, setDeleteDeckDialogOpen] = useState(false);
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CardToDelete | null>(null);

  const hasNavigatedToCard = useRef(false);
  const hasNavigatedToComment = useRef(false);

  // Handle navigating to a specific card from a flag
  useEffect(() => {
    if (targetCardIndex !== null && hasCards && !hasNavigatedToCard.current) {
      // Calculate which page the card is on
      const targetPage = Math.floor((targetCardIndex ?? 0) / cardsPerPage) + 1;
      console.log(
        `🎴 Navigating to card at index ${targetCardIndex}, page ${targetPage}, current page: ${deckDetailPage}`
      );

      // Change to the target page
      onDeckDetailPageChange(targetPage);
      hasNavigatedToCard.current = true;

      // Clear the target after navigation and highlighting (longer delay to keep highlight visible)
      setTimeout(() => {
        console.log("🎴 Clearing targetCardIndex");
        setTargetCardIndex(null);
        hasNavigatedToCard.current = false;
      }, 2000); // Increased from 500ms to 2000ms so highlight stays visible
    }
  }, [
    targetCardIndex,
    hasCards,
    cardsPerPage,
    deckDetailPage,
    onDeckDetailPageChange,
    setTargetCardIndex,
  ]);

  // Handle navigating to a specific comment from a notification
  useEffect(() => {
    if (targetCommentId && !hasNavigatedToComment.current) {
      console.log(`💬 Target comment detected: ${targetCommentId}`);
      hasNavigatedToComment.current = true;

      // Clear the target after scrolling is complete (DeckComments component handles the actual scroll)
      setTimeout(() => {
        console.log("💬 Clearing targetCommentId");
        setTargetCommentId(null);
        hasNavigatedToComment.current = false;
      }, 3000); // Give 3 seconds for highlight to be visible
    }
  }, [targetCommentId, setTargetCommentId]);

  const handleOpenFlagDialog = (
    type: FlagTargetType,
    id: string,
    name: string,
    details?: FlagTargetDetails
  ) => {
    console.log("🚩 Flag button clicked!", { type, id, name, details });
    setFlagTarget({
      type,
      id,
      name,
      details,
    });
    setFlagDialogOpen(true);
    console.log("🚩 Flag dialog state set to open");
  };

  const handleFlagComment = (commentId: string, commentText: string) => {
    const commentPreview =
      commentText.length > 40
        ? commentText.substring(0, 40) + "..."
        : commentText;
    handleOpenFlagDialog("comment", commentId, `Comment: "${commentPreview}"`, {
      deckId: deck.id,
      commentText: commentText, // Store full comment text for moderator review
    });
  };

  const handleDeleteCardLocal = (
    cardId: string,
    cardName: string,
    deckId: string
  ) => {
    setCardToDelete({ id: cardId, name: cardName, deckId });
    setDeleteCardDialogOpen(true);
  };

  const confirmDeleteDeck = async (reason: string) => {
    if (!accessToken) return;

    try {
      await deleteCommunityDeck(accessToken, deck.id, reason);
      toast.success("Deck deleted successfully");
      setDeleteDeckDialogOpen(false);
      // Navigate back to community since the deck is deleted
      onBack();
    } catch (error) {
      console.error("Failed to delete deck:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete deck";
      toast.error(errorMessage);
    }
  };

  const confirmDeleteCard = async (reason: string) => {
    if (!cardToDelete || !accessToken) return;

    try {
      await deleteCommunityCard(accessToken, deck.id, cardToDelete.id, reason);
      toast.success("Card deleted successfully");
      setDeleteCardDialogOpen(false);
      setCardToDelete(null);

      // Reload the page or refresh the deck to show updated cards
      // For now, just navigate back and let parent handle reload
      onRatingChange(); // This triggers a reload in the parent
    } catch (error) {
      console.error("Failed to delete card:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete card";
      toast.error(errorMessage);
    }
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
                    {flaggedDecks.has(deck.id) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700 flex-shrink-0">
                        <Flag className="w-3 h-3 mr-1" />
                        Marked for Review
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <button
                      onClick={() => onViewUser(deck.ownerId)}
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
                  {/* Date Information */}
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
                            }
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
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                {/* Superuser Admin Controls */}
                {isSuperuser && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleFeatured(deck.id)}
                      disabled={featuringDeckId === deck.id}
                      className="border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 h-9 sm:h-10"
                      title={
                        deck.featured
                          ? "Unfeature this deck"
                          : "Feature this deck"
                      }
                    >
                      <Star
                        className={`w-4 h-4 mr-2 ${
                          deck.featured ? "fill-current" : ""
                        }`}
                      />
                      {featuringDeckId === deck.id
                        ? "Updating..."
                        : deck.featured
                        ? "Unfeature"
                        : "Feature"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteDeckDialogOpen(true)}
                      disabled={deletingDeckId === deck.id}
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
                    handleOpenFlagDialog("deck", deck.id, deck.name)
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
                    onStudyDeck(deck);
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
                    onClick={() => onUpdateDeck(deck, importedDeck)}
                    disabled={addingDeckId === deck.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-initial text-sm sm:text-base h-9 sm:h-10 relative"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {addingDeckId === deck.id
                      ? "Updating..."
                      : "Update Available"}
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (isAdded) {
                        toast.info("You have already added this deck");
                      } else {
                        onAddDeck(deck);
                      }
                    }}
                    disabled={addingDeckId === deck.id}
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
                        {addingDeckId === deck.id
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
                    deck.difficulty
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
            cards={deck.cards}
            deckId={deck.id}
            currentPage={deckDetailPage}
            cardsPerPage={cardsPerPage}
            flaggedCards={flaggedCards}
            targetCardIndex={targetCardIndex}
            isSuperuser={isSuperuser}
            onPageChange={onDeckDetailPageChange}
            onFlagCard={(cardId, cardName, cardFront) =>
              handleOpenFlagDialog("card", cardId, cardName, {
                deckId: deck.id,
                front: cardFront,
              })
            }
            onDeleteCard={handleDeleteCardLocal}
          />

          {/* Rating Section */}
          <div className="mb-4 sm:mb-6">
            <DeckRating deckId={deck.id} onRatingChange={onRatingChange} />
          </div>

          {/* Comment Section */}
          <DeckComments
            deckId={deck.id}
            deckAuthorId={deck.ownerId}
            targetCommentId={targetCommentId}
            onViewUser={onViewUser}
            onFlagComment={handleFlagComment}
          />
        </div>
      </div>

      {/* Flag Dialog */}
      {flagTarget && (
        <FlagDialog
          open={flagDialogOpen}
          onOpenChange={setFlagDialogOpen}
          targetType={flagTarget.type}
          targetId={flagTarget.id}
          targetName={flagTarget.name}
          targetDetails={flagTarget.details}
          accessToken={accessToken}
        />
      )}

      {/* Deletion Dialog */}
      {deleteDeckDialogOpen && (
        <DeletionDialog
          open={deleteDeckDialogOpen}
          onOpenChange={setDeleteDeckDialogOpen}
          targetType="deck"
          targetId={deck.id}
          targetName={deck.name}
          onConfirm={confirmDeleteDeck}
        />
      )}
      {deleteCardDialogOpen && cardToDelete && (
        <DeletionDialog
          open={deleteCardDialogOpen}
          onOpenChange={setDeleteCardDialogOpen}
          targetType="card"
          targetId={cardToDelete.id}
          targetName={cardToDelete.name}
          onConfirm={confirmDeleteCard}
        />
      )}
    </AppLayout>
  );
}
