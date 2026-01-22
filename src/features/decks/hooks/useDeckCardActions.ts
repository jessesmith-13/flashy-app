import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { UICard, UIDeck } from "@/types/decks";
import type { CardType } from "@/types/decks";

import {
  createCard as apiCreateCard,
  updateCard as apiUpdateCard,
  deleteCard as apiDeleteCard,
  updateCardPositions as apiUpdateCardPositions,
} from "@/shared/api/decks";

import { uploadCardImage as apiUploadCardImage } from "@/shared/api/storage";
import { handleAuthError } from "@/features/auth/authErrorHandler";

import {
  toCreateCardPayload,
  toUpdateCardPayload,
  type CardData,
} from "@/features/decks/utils/cardPayload";

type StoreFns = {
  addCard: (card: UICard) => void;
  updateCard: (id: string, patch: Partial<UICard> | UICard) => void;
  removeCard: (id: string) => void;

  updateDeck: (deckId: string, patch: Partial<UIDeck>) => void;
};

type DraftsLike = {
  // new
  newCardType: CardType;
  newCardFront: string;
  newCardBack: string;
  newCardFrontImageUrl: string;
  newCardImageFile: File | null;
  newCardBackImageUrl: string;
  newCardBackImageFile: File | null;
  newCardFrontAudio: string;
  newCardBackAudio: string;
  newCardCorrectAnswers: string[];
  newCardIncorrectAnswers: string[];
  newCardAcceptedAnswers: string[];
  resetNewCardDraft: () => void;

  // edit
  editingCardId: string | null;
  editCardType: CardType;
  editCardFront: string;
  editCardBack: string;
  editCardFrontImageUrl: string;
  editCardImageFile: File | null;
  editCardBackImageUrl: string;
  editCardBackImageFile: File | null;
  editCardFrontAudio: string;
  editCardBackAudio: string;
  editCardCorrectAnswers: string[];
  editCardIncorrectAnswers: string[];
  editCardTypeAnswerAcceptedAnswers: string[];
  resetEditCardDraft: () => void;
};

export function useDeckCardActions(args: {
  accessToken: string | null | undefined;
  selectedDeckId: string | null | undefined;
  deck: UIDeck | null | undefined;
  deckCards: UICard[];

  drafts: DraftsLike;

  store: StoreFns;

  // selection comes from your useCardSelection hook
  selectedCards: Set<string>;
  clearSelectionAndExit: () => void;

  // dialog setters
  setCreateDialogOpen: (open: boolean) => void;
  setEditCardDialogOpen: (open: boolean) => void;
}) {
  const {
    accessToken,
    selectedDeckId,
    deck,
    deckCards,
    drafts,
    store,
    selectedCards,
    clearSelectionAndExit,
    setCreateDialogOpen,
    setEditCardDialogOpen,
  } = args;

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBackImage, setUploadingBackImage] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [uploadingEditBackImage, setUploadingEditBackImage] = useState(false);

  const requireAuth = useCallback(() => {
    if (!accessToken || !selectedDeckId) return null;
    return { accessToken, selectedDeckId };
  }, [accessToken, selectedDeckId]);

  const validateNew = useCallback((): boolean => {
    const {
      newCardType,
      newCardFront,
      newCardBack,
      newCardImageFile,
      newCardBackImageFile,
      newCardCorrectAnswers,
      newCardIncorrectAnswers,
      newCardAcceptedAnswers,
    } = drafts;

    if (!newCardFront.trim() && !newCardImageFile) {
      toast.error("Please provide question text or image");
      return false;
    }

    if (newCardType === "multiple-choice") {
      const filledCorrect = newCardCorrectAnswers.filter((a) => a.trim());
      const filledIncorrect = newCardIncorrectAnswers.filter((a) => a.trim());
      if (filledCorrect.length === 0) {
        toast.error("Please provide at least one correct answer");
        return false;
      }
      if (filledIncorrect.length === 0) {
        toast.error("Please provide at least one incorrect option");
        return false;
      }
    }

    if (newCardType === "classic-flip" || newCardType === "type-answer") {
      if (!newCardBack.trim() && !newCardBackImageFile) {
        toast.error("Please provide answer text or image");
        return false;
      }

      if (newCardType === "type-answer") {
        const filledAccepted = newCardAcceptedAnswers.filter((a) => a.trim());
        // your old code allowed empty acceptedAnswers for new type-answer; keep consistent:
        // if you want to require at least one accepted answer, uncomment below:
        // if (filledAccepted.length === 0) {
        //   toast.error("Please provide at least one accepted answer");
        //   return false;
        // }
        void filledAccepted;
      }
    }

    return true;
  }, [drafts]);

  const validateEdit = useCallback((): boolean => {
    const {
      editCardType,
      editCardFront,
      editCardBack,
      editCardImageFile,
      editCardFrontImageUrl,
      editCardBackImageFile,
      editCardBackImageUrl,
      editCardCorrectAnswers,
      editCardIncorrectAnswers,
      editCardTypeAnswerAcceptedAnswers,
    } = drafts;

    if (!editCardFront.trim() && !editCardImageFile && !editCardFrontImageUrl) {
      toast.error("Please provide question text or image");
      return false;
    }

    if (editCardType === "multiple-choice") {
      const filledCorrect = editCardCorrectAnswers.filter((a) => a.trim());
      const filledIncorrect = editCardIncorrectAnswers.filter((a) => a.trim());
      if (filledCorrect.length === 0) {
        toast.error("Please provide at least one correct answer");
        return false;
      }
      if (filledIncorrect.length === 0) {
        toast.error("Please provide at least one incorrect option");
        return false;
      }
    }

    if (editCardType === "classic-flip") {
      if (
        !editCardBack.trim() &&
        !editCardBackImageFile &&
        !editCardBackImageUrl
      ) {
        toast.error("Please provide answer text or image");
        return false;
      }
    }

    if (editCardType === "type-answer") {
      if (
        !editCardBack.trim() &&
        !editCardBackImageFile &&
        !editCardBackImageUrl
      ) {
        toast.error("Please provide answer text or image");
        return false;
      }
      const filledAccepted = editCardTypeAnswerAcceptedAnswers.filter((a) =>
        a.trim(),
      );
      if (filledAccepted.length === 0) {
        toast.error("Please provide at least one accepted answer");
        return false;
      }
    }

    return true;
  }, [drafts]);

  const handleCreateCard = useCallback(
    async (e: React.FormEvent, closeDialog: boolean = true) => {
      e.preventDefault();

      const auth = requireAuth();
      if (!auth) return;
      if (!validateNew()) return;

      const {
        newCardType,
        newCardFront,
        newCardBack,
        newCardFrontImageUrl,
        newCardImageFile,
        newCardBackImageUrl,
        newCardBackImageFile,
        newCardFrontAudio,
        newCardBackAudio,
        newCardCorrectAnswers,
        newCardIncorrectAnswers,
        newCardAcceptedAnswers,
        resetNewCardDraft,
      } = drafts;

      setCreating(true);

      try {
        const cardData: CardData = {
          front: newCardFront,
          cardType: newCardType,
        };

        // front image
        if (newCardImageFile) {
          try {
            setUploadingImage(true);
            const imageUrl = await apiUploadCardImage(
              auth.accessToken,
              newCardImageFile,
            );
            cardData.frontImageUrl = imageUrl;
          } catch (err) {
            console.error("Failed to upload card image:", err);
            toast.error("Failed to upload image");
            return;
          } finally {
            setUploadingImage(false);
          }
        } else if (newCardFrontImageUrl.trim()) {
          cardData.frontImageUrl = newCardFrontImageUrl.trim();
        }

        // per type
        if (newCardType === "classic-flip") {
          cardData.back = newCardBack;

          if (newCardBackImageFile) {
            try {
              setUploadingBackImage(true);
              const backImageUrl = await apiUploadCardImage(
                auth.accessToken,
                newCardBackImageFile,
              );
              cardData.backImageUrl = backImageUrl;
            } catch (err) {
              console.error("Failed to upload answer image:", err);
              toast.error("Failed to upload answer image");
              return;
            } finally {
              setUploadingBackImage(false);
            }
          } else if (newCardBackImageUrl.trim()) {
            cardData.backImageUrl = newCardBackImageUrl.trim();
          }

          if (newCardFrontAudio.trim())
            cardData.frontAudio = newCardFrontAudio.trim();
          if (newCardBackAudio.trim())
            cardData.backAudio = newCardBackAudio.trim();
        }

        if (newCardType === "multiple-choice") {
          cardData.correctAnswers = newCardCorrectAnswers.filter((a) =>
            a.trim(),
          );
          cardData.incorrectAnswers = newCardIncorrectAnswers.filter((a) =>
            a.trim(),
          );
        }

        if (newCardType === "type-answer") {
          cardData.back = newCardBack;
          cardData.acceptedAnswers = newCardAcceptedAnswers.filter((a) =>
            a.trim(),
          );

          if (newCardBackImageFile) {
            try {
              setUploadingBackImage(true);
              const backImageUrl = await apiUploadCardImage(
                auth.accessToken,
                newCardBackImageFile,
              );
              cardData.backImageUrl = backImageUrl;
            } catch (err) {
              console.error("Failed to upload answer image:", err);
              toast.error("Failed to upload answer image");
              return;
            } finally {
              setUploadingBackImage(false);
            }
          } else if (newCardBackImageUrl.trim()) {
            cardData.backImageUrl = newCardBackImageUrl.trim();
          }
        }

        const apiData = toCreateCardPayload(cardData);
        const created = await apiCreateCard(
          auth.accessToken,
          auth.selectedDeckId,
          apiData,
        );

        store.addCard(created);

        if (deck) {
          store.updateDeck(deck.id, { cardCount: (deck.cardCount || 0) + 1 });
        }

        resetNewCardDraft();

        if (closeDialog) {
          setCreateDialogOpen(false);
          toast.success("Card created successfully!");
        } else {
          toast.success("Card added! Add another card below.");
        }
      } catch (err) {
        handleAuthError(err);
        console.error("Failed to create card:", err);
        toast.error("Failed to create card");
      } finally {
        setCreating(false);
      }
    },
    [deck, drafts, requireAuth, setCreateDialogOpen, store, validateNew],
  );

  const handleUpdateCard = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const auth = requireAuth();
      if (!auth) return;

      const editingCardId = drafts.editingCardId;
      if (!editingCardId) return;

      if (!validateEdit()) return;

      setUpdating(true);
      try {
        const cardData: CardData = {
          id: editingCardId,
          front: drafts.editCardFront,
          cardType: drafts.editCardType,
        };

        // front image
        if (drafts.editCardImageFile) {
          try {
            setUploadingEditImage(true);
            const url = await apiUploadCardImage(
              auth.accessToken,
              drafts.editCardImageFile,
            );
            cardData.frontImageUrl = url;
          } catch (err) {
            console.error("Failed to upload card image:", err);
            toast.error("Failed to upload image");
            return;
          } finally {
            setUploadingEditImage(false);
          }
        } else if (drafts.editCardFrontImageUrl.trim()) {
          cardData.frontImageUrl = drafts.editCardFrontImageUrl.trim();
        } else {
          cardData.frontImageUrl = null;
        }

        if (drafts.editCardType === "classic-flip") {
          cardData.back = drafts.editCardBack;

          if (drafts.editCardBackImageFile) {
            try {
              setUploadingEditBackImage(true);
              const url = await apiUploadCardImage(
                auth.accessToken,
                drafts.editCardBackImageFile,
              );
              cardData.backImageUrl = url;
            } catch (err) {
              console.error("Failed to upload answer image:", err);
              toast.error("Failed to upload answer image");
              return;
            } finally {
              setUploadingEditBackImage(false);
            }
          } else if (drafts.editCardBackImageUrl.trim()) {
            cardData.backImageUrl = drafts.editCardBackImageUrl.trim();
          } else {
            cardData.backImageUrl = null;
          }

          cardData.frontAudio = drafts.editCardFrontAudio.trim()
            ? drafts.editCardFrontAudio.trim()
            : null;
          cardData.backAudio = drafts.editCardBackAudio.trim()
            ? drafts.editCardBackAudio.trim()
            : null;
        }

        if (drafts.editCardType === "multiple-choice") {
          cardData.correctAnswers = drafts.editCardCorrectAnswers.filter((a) =>
            a.trim(),
          );
          cardData.incorrectAnswers = drafts.editCardIncorrectAnswers.filter(
            (a) => a.trim(),
          );
        }

        if (drafts.editCardType === "type-answer") {
          cardData.back = drafts.editCardBack;
          cardData.acceptedAnswers =
            drafts.editCardTypeAnswerAcceptedAnswers.filter((a) => a.trim());

          if (drafts.editCardBackImageFile) {
            try {
              setUploadingEditBackImage(true);
              const url = await apiUploadCardImage(
                auth.accessToken,
                drafts.editCardBackImageFile,
              );
              cardData.backImageUrl = url;
            } catch (err) {
              console.error("Failed to upload answer image:", err);
              toast.error("Failed to upload answer image");
              return;
            } finally {
              setUploadingEditBackImage(false);
            }
          } else if (drafts.editCardBackImageUrl.trim()) {
            cardData.backImageUrl = drafts.editCardBackImageUrl.trim();
          } else {
            cardData.backImageUrl = null;
          }
        }

        const apiData = toUpdateCardPayload(cardData);

        const updated = await apiUpdateCard(
          auth.accessToken,
          auth.selectedDeckId,
          editingCardId,
          apiData,
        );

        store.updateCard(editingCardId, updated);

        setEditCardDialogOpen(false);
        toast.success("Card updated successfully!");
        drafts.resetEditCardDraft();
      } catch (err) {
        handleAuthError(err);
        console.error("Failed to update card:", err);
        toast.error("Failed to update card");
      } finally {
        setUpdating(false);
      }
    },
    [drafts, requireAuth, setEditCardDialogOpen, store, validateEdit],
  );

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (!accessToken || !deck) return;

      try {
        await apiDeleteCard(accessToken, deck.id, cardId);
        store.removeCard(cardId);

        // keep count in sync based on current store deck copy if you want,
        // but simplest: decrement
        const newCount = Math.max(0, (deck.cardCount || 0) - 1);
        store.updateDeck(deck.id, { cardCount: newCount });

        toast.success("Card deleted successfully!");
      } catch (err) {
        handleAuthError(err);
        console.error("Failed to delete card:", err);
        toast.error("Failed to delete card");
      }
    },
    [accessToken, deck, store],
  );

  const handleDeleteSelectedCards = useCallback(async () => {
    if (!accessToken || !deck) return;
    if (selectedCards.size === 0) return;

    try {
      const cardIds = Array.from(selectedCards);
      await Promise.all(
        cardIds.map((id) => apiDeleteCard(accessToken, deck.id, id)),
      );

      cardIds.forEach((id) => store.removeCard(id));

      const remainingCards = deckCards.filter((c) => !cardIds.includes(c.id));
      store.updateDeck(deck.id, { cardCount: remainingCards.length });

      clearSelectionAndExit();
      toast.success(`${cardIds.length} cards deleted successfully!`);
    } catch (err) {
      handleAuthError(err);
      console.error("Failed to delete cards:", err);
      toast.error("Failed to delete cards");
    }
  }, [
    accessToken,
    clearSelectionAndExit,
    deck,
    deckCards,
    selectedCards,
    store,
  ]);

  // (Optional) pull reorder to hook too if you still have it in-page:
  const persistReorder = useCallback(
    async (positions: Array<{ id: string; position: number }>) => {
      if (!accessToken || !selectedDeckId) return;
      await apiUpdateCardPositions(accessToken, selectedDeckId, positions);
    },
    [accessToken, selectedDeckId],
  );

  return {
    // flags
    creating,
    updating,
    uploadingImage,
    uploadingBackImage,
    uploadingEditImage,
    uploadingEditBackImage,

    // handlers
    handleCreateCard,
    handleUpdateCard,
    handleDeleteCard,
    handleDeleteSelectedCards,

    // optional helper
    persistReorder,
  };
}
