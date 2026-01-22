import { useCallback } from "react";
import { toast } from "sonner";

import type { UICard } from "@/types/decks";
import type { CardType } from "@/types/decks";
import type { CreateCardPayload } from "@/shared/api/decks/types.api";

import { createCardsBatch as apiCreateCardsBatch } from "@/shared/api/decks";
import { uploadCardImage as apiUploadCardImage } from "@/shared/api/storage";
import { uploadCardAudio as apiUploadCardAudio } from "@/shared/api/storage";
import { translateText as apiTranslateText } from "@/shared/api/ai";

import { handleAuthError } from "@/features/auth/authErrorHandler";

import {
  toCreateCardPayload,
  type CardData,
} from "@/features/decks/utils/cardPayload";

export type BulkCardFormData = {
  front?: string;
  back?: string;
  cardType?: CardType;

  frontImageFile?: File | null;
  backImageFile?: File | null;

  frontAudio?: string;
  backAudio?: string;

  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];
};

type UseBulkCardCreateArgs = {
  accessToken: string | null;
  selectedDeckId: string | null;

  // store actions
  addCard: (card: UICard) => void;
  bumpDeckCardCount: (delta: number) => void; // e.g. (n) => updateDeck(deck.id, { cardCount: deck.cardCount+n })
};

export function useBulkCardCreate({
  accessToken,
  selectedDeckId,
  addCard,
  bumpDeckCardCount,
}: UseBulkCardCreateArgs) {
  const requireAuth = useCallback((): {
    token: string;
    deckId: string;
  } | null => {
    if (!accessToken) {
      toast.error("Please log in");
      return null;
    }
    if (!selectedDeckId) return null;
    return { token: accessToken, deckId: selectedDeckId };
  }, [accessToken, selectedDeckId]);

  const bulkTranslate = useCallback(
    async (text: string, language: string): Promise<string> => {
      const req = requireAuth();
      if (!req) throw new Error("Not authenticated");
      const result = await apiTranslateText(req.token, text, language);
      return result.translatedText;
    },
    [requireAuth],
  );

  const bulkImageUpload = useCallback(
    async (file: File): Promise<string> => {
      const req = requireAuth();
      if (!req) throw new Error("Not authenticated");
      return apiUploadCardImage(req.token, file);
    },
    [requireAuth],
  );

  const bulkAudioUpload = useCallback(async (file: File): Promise<string> => {
    // your storage API doesn’t require token in your code snippet
    return apiUploadCardAudio(file);
  }, []);

  const bulkAddCards = useCallback(
    async (cardsData: BulkCardFormData[]) => {
      const req = requireAuth();
      if (!req) return;

      try {
        const cardsToCreate: CreateCardPayload[] = [];
        const failedCards: BulkCardFormData[] = [];

        for (const cardInput of cardsData) {
          try {
            const cardType: CardType = (cardInput.cardType ||
              "classic-flip") as CardType;

            const cardData: CardData = {
              front: cardInput.front || "",
              cardType,
            };

            // front image
            if (cardInput.frontImageFile) {
              try {
                const url = await apiUploadCardImage(
                  req.token,
                  cardInput.frontImageFile,
                );
                cardData.frontImageUrl = url;
              } catch (err: unknown) {
                console.error("Failed to upload front image:", err);
                failedCards.push(cardInput);
                continue;
              }
            }

            if (cardType === "classic-flip") {
              cardData.back = cardInput.back || "";

              if (cardInput.backImageFile) {
                try {
                  const url = await apiUploadCardImage(
                    req.token,
                    cardInput.backImageFile,
                  );
                  cardData.backImageUrl = url;
                } catch (err: unknown) {
                  console.error("Failed to upload back image:", err);
                  failedCards.push(cardInput);
                  continue;
                }
              }

              if (cardInput.frontAudio)
                cardData.frontAudio = cardInput.frontAudio;
              if (cardInput.backAudio) cardData.backAudio = cardInput.backAudio;
            } else if (cardType === "multiple-choice") {
              cardData.correctAnswers = (cardInput.correctAnswers || []).filter(
                (a) => a.trim(),
              );
              cardData.incorrectAnswers = (
                cardInput.incorrectAnswers || []
              ).filter((a) => a.trim());
            } else if (cardType === "type-answer") {
              cardData.back = cardInput.back || "";
              cardData.acceptedAnswers = (
                cardInput.acceptedAnswers || []
              ).filter((a) => a.trim());
            }

            cardsToCreate.push(toCreateCardPayload(cardData));
          } catch (err: unknown) {
            console.error("Error processing card:", err);
            failedCards.push(cardInput);
          }
        }

        if (cardsToCreate.length > 0) {
          const createdCards = await apiCreateCardsBatch(
            req.token,
            req.deckId,
            cardsToCreate,
          );
          createdCards.forEach((c: UICard) => addCard(c));
          bumpDeckCardCount(cardsToCreate.length);
        }

        if (cardsToCreate.length > 0) {
          toast.success(`Successfully added ${cardsToCreate.length} card(s)!`);
        }
        if (failedCards.length > 0) {
          toast.error(
            `Failed to add ${failedCards.length} card(s) due to errors`,
          );
        }
      } catch (err: unknown) {
        handleAuthError(err);
        console.error("Failed to bulk add cards:", err);
        toast.error("Failed to add cards. Please try again.");
      }
    },
    [addCard, bumpDeckCardCount, requireAuth],
  );

  return {
    bulkAddCards,
    bulkTranslate,
    bulkImageUpload,
    bulkAudioUpload,
  };
}
