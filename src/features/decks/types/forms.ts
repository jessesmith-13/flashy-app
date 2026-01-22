import type { CardType } from "@/types/decks";

export type CardFormDraft = {
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
