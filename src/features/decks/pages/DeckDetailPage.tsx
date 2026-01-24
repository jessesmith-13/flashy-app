import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/Layout/AppLayout";
import { UpgradeModal } from "@/components/UpgradeModal";

import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";
import { canPublishToCommunity } from "@/shared/entitlements/subscription";

import { DeckHeader } from "../components/deck-detail/DeckHeader";
import { AddCardModal } from "../components/deck-detail/AddCardModal";
import { EditCardModal } from "../components/deck-detail/EditCardModal";
import { CardList } from "../components/deck-detail/CardList";
import { DeckSettingsDialog } from "../components/shared/DeckSettingsDialog";
import { PublishDeckDialog } from "../components/shared/PublishDeckDialog";
import { UnpublishDeckDialog } from "@/shared/components/UnpublishDeckDialog";
import {
  BulkAddCardsDialog,
  type CardFormData,
} from "../components/deck-detail/BulkAddCardsDialog";

import { useDeckDetailDerived } from "@/features/decks/hooks/useDeckDetailDerived";
import { useDeckCardsLoader } from "@/features/decks/hooks/useDeckCardsLoader";
import { useCommunityDeckAuthor } from "@/features/decks/hooks/useCommunityDeckAuthor";
import { useDeckSettingsDraft } from "@/features/decks/hooks/useDeckSettingsDraft";
import { useCardSelection } from "@/features/decks/hooks/useCardSelection";
import { useCardReorder } from "@/features/decks/hooks/useCardReorder";

import { useDecksActions } from "@/features/decks/hooks/useDecksActions";
import { useBulkCardCreate } from "@/features/decks/hooks/useBulkCardCreate";

import { useCardDraftState } from "@/features/decks/hooks/useCardDraftState";
import { useDeckCardActions } from "@/features/decks/hooks/useDeckCardActions";
import { useCardFlags } from "@/features/decks/hooks/useCardFlags";
import { useDeckCardTranslation } from "@/features/decks/hooks/useDeckCardTranslation";

import type { UIDeck, UICard } from "@/types/decks";
import type { DifficultyLevel } from "@/types/decks";

export function DeckDetailPage() {
  const {
    user,
    accessToken,
    selectedDeckId,
    updateDeck,
    addCard,
    updateCard,
    removeCard,
  } = useStore();

  const { navigateTo } = useNavigation();

  const { deck, deckCards, studyCount, averageScore } = useDeckDetailDerived();

  const [loading, setLoading] = useState(true);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCardDialogOpen, setEditCardDialogOpen] = useState(false);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  // loaders
  const loadCards = useDeckCardsLoader(setLoading);
  const { communityDeckAuthor, loadCommunityDeckAuthor } =
    useCommunityDeckAuthor();

  useEffect(() => {
    void loadCards();
  }, [loadCards, selectedDeckId]);

  // deck settings draft
  const {
    draft: deckDraft,
    setName: setEditName,
    setEmoji: setEditEmoji,
    setColor: setEditColor,
    setCategory: setEditCategory,
    setSubtopic: setEditSubtopic,
    setDifficulty: setEditDifficulty,
    setFrontLanguage: setEditFrontLanguage,
    setBackLanguage: setEditBackLanguage,
    toUpdates: deckUpdates,
  } = useDeckSettingsDraft(deck, loadCommunityDeckAuthor);

  // selection + reorder
  const {
    selectionMode,
    selectedCards,
    toggleSelectionMode,
    toggleCard,
    selectAll,
    deselectAll,
    clearAndExit,
  } = useCardSelection(deckCards);

  const { onCardDragStart, onCardDragOver, onCardDrop } = useCardReorder(
    deckCards,
    (cardId: string, patch: Partial<UICard>) => updateCard(cardId, patch),
    accessToken,
    selectedDeckId,
  );

  // shared deck actions (publish/unpublish/update/delete/etc)
  const decksActions = useDecksActions();

  const canPublish = useMemo(
    () =>
      canPublishToCommunity(
        user?.subscriptionTier,
        user?.isSuperuser,
        user?.isModerator,
      ),
    [user?.subscriptionTier, user?.isSuperuser, user?.isModerator],
  );

  const handleOpenPublish = () => {
    if (!canPublish) setUpgradeModalOpen(true);
    else setPublishDialogOpen(true);
  };

  const handlePublishDeck = async () => {
    if (!deck) return;
    await decksActions.publish(deck);
    setPublishDialogOpen(false);
  };
  const handleUnpublishDeck = () => {
    setUnpublishDialogOpen(true);
  };

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deck) return;

    await decksActions.onUpdateDeck(deck as UIDeck, {
      name: deckDraft.name,
      emoji: deckDraft.emoji,
      color: deckDraft.color,
      category: deckDraft.category || undefined,
      subtopic: deckDraft.subtopic || undefined,
      difficulty: (deckDraft.difficulty || undefined) as DifficultyLevel,
    });

    // If you ALSO want to update languages via the API, that belongs in useDecksActions.onUpdateDeck
    // (your current onUpdateDeck signature doesn't include languages).
    // For now, keep UI store aligned so the dialog reflects saved values:
    updateDeck(deck.id, {
      ...deckUpdates,
    });

    setEditDialogOpen(false);
  };

  // ----------------------------
  // Card drafts (your hook)
  // ----------------------------
  const drafts = useCardDraftState();

  // ----------------------------
  // Card CRUD (your hook: useDeckCardActions)
  // ----------------------------
  const cardActions = useDeckCardActions({
    accessToken,
    selectedDeckId,
    deck: deck ?? null,
    deckCards,
    drafts,
    store: {
      addCard,
      updateCard: (id: string, patch: Partial<UICard> | UICard) =>
        updateCard(id, patch as Partial<UICard>),
      removeCard,
      updateDeck: (deckId: string, patch: Partial<UIDeck>) =>
        updateDeck(deckId, patch),
    },
    selectedCards,
    clearSelectionAndExit: clearAndExit,
    setCreateDialogOpen,
    setEditCardDialogOpen,
  });

  // open edit modal from a card
  const handleOpenEditCard = (cardId: string) => {
    const card = deckCards.find((c) => c.id === cardId);
    if (!card) return;
    drafts.openEditFromCard(card);
    setEditCardDialogOpen(true);
  };

  // ----------------------------
  // Card flags (favorite/ignored)
  // ----------------------------
  const cardFlags = useCardFlags({
    accessToken,
    deck: deck ?? null,
    deckCards,
    updateCardInStore: (cardId: string, patch: Partial<UICard>) =>
      updateCard(cardId, patch),
  });

  // ----------------------------
  // Translation (your hook)
  // ----------------------------
  const translations = useDeckCardTranslation({
    accessToken,
    user: user ?? null,
    deck: deck ?? null,

    newFront: drafts.newCardFront,
    newBack: drafts.newCardBack,
    setNewFront: drafts.setNewCardFront,
    setNewBack: drafts.setNewCardBack,

    editFront: drafts.editCardFront,
    editBack: drafts.editCardBack,
    setEditFront: drafts.setEditCardFront,
    setEditBack: drafts.setEditCardBack,

    onRequireUpgrade: () => setUpgradeModalOpen(true),
  });

  // ----------------------------
  // Bulk add (your hook)
  // ----------------------------
  const bulk = useBulkCardCreate({
    accessToken,
    selectedDeckId,
    addCard,
    bumpDeckCardCount: (delta: number) => {
      if (!deck) return;
      updateDeck(deck.id, { cardCount: (deck.cardCount || 0) + delta });
    },
  });

  if (!deck) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-900 dark:text-gray-100">Deck not found</div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">
            Loading cards...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <DeckHeader
            deck={deck}
            cardCount={deckCards.length}
            onBack={() => navigateTo("decks")}
            onOpenSettings={() => setEditDialogOpen(true)}
            onOpenPublish={handleOpenPublish}
            onUnpublish={handleUnpublishDeck}
            onDelete={async () => {
              await decksActions.onDeleteDeck(deck.id);
              navigateTo("decks");
            }}
            onAddCard={() => setCreateDialogOpen(true)}
            onBulkAddCards={() => setBulkAddDialogOpen(true)}
            onAIGenerate={() => navigateTo("ai-generate")}
            deleting={decksActions.deletingDeckId === deck.id}
            unpublishing={decksActions.unpublishingDeckId === deck.id}
            canPublish={canPublish}
            communityDeckAuthor={communityDeckAuthor}
            studyCount={studyCount}
            averageScore={averageScore}
            onStartStudy={() => {
              const count = deck.cardCount ?? 0;
              if (count === 0) {
                toast.error("Add some cards to this deck before studying!");
                return;
              }
              // whatever route you use when launching study from list page:
              navigateTo("study-options");
            }}
          />

          <DeckSettingsDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            name={deckDraft.name}
            emoji={deckDraft.emoji}
            color={deckDraft.color}
            category={deckDraft.category}
            subtopic={deckDraft.subtopic}
            difficulty={deckDraft.difficulty}
            frontLanguage={deckDraft.frontLanguage}
            backLanguage={deckDraft.backLanguage}
            onNameChange={setEditName}
            onEmojiChange={setEditEmoji}
            onColorChange={setEditColor}
            onCategoryChange={setEditCategory}
            onSubtopicChange={setEditSubtopic}
            onDifficultyChange={setEditDifficulty}
            onFrontLanguageChange={setEditFrontLanguage}
            onBackLanguageChange={setEditBackLanguage}
            onSubmit={handleUpdateDeck}
          />

          <PublishDeckDialog
            open={publishDialogOpen}
            onOpenChange={setPublishDialogOpen}
            deck={deck}
            cardCount={deckCards.length}
            publishing={decksActions.publishing}
            onPublish={handlePublishDeck}
            onOpenSettings={() => {
              setPublishDialogOpen(false);
              setEditDialogOpen(true);
            }}
          />

          <UnpublishDeckDialog
            open={unpublishDialogOpen}
            onOpenChange={setUnpublishDialogOpen}
            deck={{
              name: deck.name,
              emoji: deck.emoji,
              color: deck.color,
              cardCount: deckCards.length, // or deck.cardCount ?? deckCards.length
              category: deck.category ?? null,
              subtopic: deck.subtopic ?? null,
            }}
            isLoading={decksActions.unpublishingDeckId === deck.id}
            onConfirm={async () => {
              await decksActions.unpublish(deck);
              setUnpublishDialogOpen(false);
            }}
          />

          <AddCardModal
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            cardType={drafts.newCardType}
            front={drafts.newCardFront}
            back={drafts.newCardBack}
            frontImageUrl={drafts.newCardFrontImageUrl}
            frontImageFile={drafts.newCardImageFile}
            backImageUrl={drafts.newCardBackImageUrl}
            backImageFile={drafts.newCardBackImageFile}
            frontAudio={drafts.newCardFrontAudio}
            backAudio={drafts.newCardBackAudio}
            correctAnswers={drafts.newCardCorrectAnswers}
            incorrectAnswers={drafts.newCardIncorrectAnswers}
            acceptedAnswers={drafts.newCardAcceptedAnswers}
            creating={cardActions.creating}
            uploadingImage={cardActions.uploadingImage}
            uploadingBackImage={cardActions.uploadingBackImage}
            userTier={user?.subscriptionTier}
            deckFrontLanguage={deck.frontLanguage || undefined}
            deckBackLanguage={deck.backLanguage || undefined}
            onCardTypeChange={drafts.setNewCardType}
            onFrontChange={drafts.setNewCardFront}
            onBackChange={drafts.setNewCardBack}
            onFrontImageChange={(file: File | null, url: string) => {
              drafts.setNewCardImageFile(file);
              drafts.setNewCardFrontImageUrl(url);
            }}
            onBackImageChange={(file: File | null, url: string) => {
              drafts.setNewCardBackImageFile(file);
              drafts.setNewCardBackImageUrl(url);
            }}
            onFrontAudioChange={drafts.setNewCardFrontAudio}
            onBackAudioChange={drafts.setNewCardBackAudio}
            onCorrectAnswersChange={drafts.setNewCardCorrectAnswers}
            onIncorrectAnswersChange={drafts.setNewCardIncorrectAnswers}
            onAcceptedAnswersChange={drafts.setNewCardAcceptedAnswers}
            onSubmit={cardActions.handleCreateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            onTranslateFront={translations.handleTranslateFront}
            onTranslateBack={translations.handleTranslateBack}
            isSuperuser={user?.isSuperuser}
            translatingFront={translations.translatingFront}
            translatingBack={translations.translatingBack}
          />

          <EditCardModal
            open={editCardDialogOpen}
            onOpenChange={setEditCardDialogOpen}
            cardType={drafts.editCardType}
            front={drafts.editCardFront}
            back={drafts.editCardBack}
            frontImageUrl={drafts.editCardFrontImageUrl}
            frontImageFile={drafts.editCardImageFile}
            backImageUrl={drafts.editCardBackImageUrl}
            backImageFile={drafts.editCardBackImageFile}
            frontAudio={drafts.editCardFrontAudio}
            backAudio={drafts.editCardBackAudio}
            correctAnswers={drafts.editCardCorrectAnswers}
            incorrectAnswers={drafts.editCardIncorrectAnswers}
            acceptedAnswers={drafts.editCardTypeAnswerAcceptedAnswers}
            updating={cardActions.updating}
            uploadingImage={cardActions.uploadingEditImage}
            uploadingBackImage={cardActions.uploadingEditBackImage}
            userTier={user?.subscriptionTier}
            deckFrontLanguage={deck.frontLanguage || undefined}
            deckBackLanguage={deck.backLanguage || undefined}
            onCardTypeChange={drafts.setEditCardType}
            onFrontChange={drafts.setEditCardFront}
            onBackChange={drafts.setEditCardBack}
            onFrontImageChange={(file: File | null, url: string) => {
              drafts.setEditCardImageFile(file);
              drafts.setEditCardFrontImageUrl(url);
            }}
            onBackImageChange={(file: File | null, url: string) => {
              drafts.setEditCardBackImageFile(file);
              drafts.setEditCardBackImageUrl(url);
            }}
            onFrontAudioChange={drafts.setEditCardFrontAudio}
            onBackAudioChange={drafts.setEditCardBackAudio}
            onCorrectAnswersChange={drafts.setEditCardCorrectAnswers}
            onIncorrectAnswersChange={drafts.setEditCardIncorrectAnswers}
            onAcceptedAnswersChange={
              drafts.setEditCardTypeAnswerAcceptedAnswers
            }
            onSubmit={cardActions.handleUpdateCard}
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            onTranslateFront={translations.handleTranslateEditFront}
            onTranslateBack={translations.handleTranslateEditBack}
            translatingFront={translations.translatingEditFront}
            translatingBack={translations.translatingEditBack}
          />

          <BulkAddCardsDialog
            open={bulkAddDialogOpen}
            onOpenChange={setBulkAddDialogOpen}
            onSubmit={async (cards: CardFormData[]) => {
              await bulk.bulkAddCards(cards);
            }}
            deckFrontLanguage={deck.frontLanguage || undefined}
            deckBackLanguage={deck.backLanguage || undefined}
            userTier={user?.subscriptionTier}
            onTranslate={bulk.bulkTranslate}
            onUploadImage={bulk.bulkImageUpload}
            onUploadAudio={bulk.bulkAudioUpload}
          />

          <CardList
            cards={deckCards}
            onEditCard={handleOpenEditCard}
            onDeleteCard={cardActions.handleDeleteCard}
            onToggleFavorite={cardFlags.onToggleFavorite}
            onToggleIgnored={cardFlags.onToggleIgnored}
            onCardDragStart={onCardDragStart}
            onCardDragOver={onCardDragOver}
            onCardDrop={onCardDrop}
            selectionMode={selectionMode}
            onToggleSelectionMode={toggleSelectionMode}
            onToggleCardSelection={toggleCard}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onBulkDelete={cardActions.handleDeleteSelectedCards}
            selectedCards={selectedCards}
          />

          <UpgradeModal
            open={upgradeModalOpen}
            onOpenChange={setUpgradeModalOpen}
          />
        </div>
      </div>
    </AppLayout>
  );
}
