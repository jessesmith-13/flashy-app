import type {
  CreateCardPayload,
  UpdateCardPayload,
} from "@/shared/api/decks/types.api";
import type { CardType } from "@/types/decks";

/**
 * Local draft shape used inside DeckDetailPage (and hooks).
 * Keep it stable so the page doesn't explode if other types change.
 */
export type CardData = {
  id?: string;

  front: string;
  back?: string;

  cardType: CardType;

  frontImageUrl?: string | null;
  backImageUrl?: string | null;

  frontAudio?: string | null;
  backAudio?: string | null;

  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];
};

export const toCreateCardPayload = (cardData: CardData): CreateCardPayload => {
  const payload: Record<string, unknown> = {
    front: cardData.front,
    cardType: cardData.cardType,
  };

  if (cardData.back !== undefined) payload.back = cardData.back;

  if (cardData.frontImageUrl !== undefined)
    payload.frontImageUrl = cardData.frontImageUrl;
  if (cardData.backImageUrl !== undefined)
    payload.backImageUrl = cardData.backImageUrl;

  if (cardData.frontAudio !== undefined)
    payload.frontAudio = cardData.frontAudio;
  if (cardData.backAudio !== undefined) payload.backAudio = cardData.backAudio;

  if (cardData.correctAnswers !== undefined)
    payload.correctAnswers = cardData.correctAnswers;
  if (cardData.incorrectAnswers !== undefined)
    payload.incorrectAnswers = cardData.incorrectAnswers;
  if (cardData.acceptedAnswers !== undefined)
    payload.acceptedAnswers = cardData.acceptedAnswers;

  return payload as CreateCardPayload;
};

export const toUpdateCardPayload = (cardData: CardData): UpdateCardPayload => {
  const payload: Record<string, unknown> = {};

  if (cardData.front !== undefined) payload.front = cardData.front;
  if (cardData.back !== undefined) payload.back = cardData.back;
  if (cardData.cardType !== undefined) payload.cardType = cardData.cardType;

  if (cardData.frontImageUrl !== undefined)
    payload.frontImageUrl = cardData.frontImageUrl;
  if (cardData.backImageUrl !== undefined)
    payload.backImageUrl = cardData.backImageUrl;

  if (cardData.frontAudio !== undefined)
    payload.frontAudio = cardData.frontAudio;
  if (cardData.backAudio !== undefined) payload.backAudio = cardData.backAudio;

  if (cardData.correctAnswers !== undefined)
    payload.correctAnswers = cardData.correctAnswers;
  if (cardData.incorrectAnswers !== undefined)
    payload.incorrectAnswers = cardData.incorrectAnswers;
  if (cardData.acceptedAnswers !== undefined)
    payload.acceptedAnswers = cardData.acceptedAnswers;

  return payload as UpdateCardPayload;
};
