// src/features/decks/components/deck-detail/bulk/bulkCardFactories.ts
import type { CardType } from "@/types/decks";
import type { CardFormData } from "../BulkAddCardsDialog";

export function makeEmptyCard(id: string): CardFormData {
  return {
    id,
    cardType: "classic-flip" as CardType,
    front: "",
    back: "",
    frontImageUrl: "",
    frontImageFile: null,
    backImageUrl: "",
    backImageFile: null,
    correctAnswers: [""],
    incorrectAnswers: ["", "", ""],
    acceptedAnswers: [""],
  };
}

export function makeCards(count: number): CardFormData[] {
  return Array.from({ length: count }, (_, i) => makeEmptyCard(`card-${i}`));
}

export function isCardFilled(card: CardFormData): boolean {
  const hasFront = card.front.trim() || card.frontImageFile;

  if (card.cardType === "multiple-choice") {
    const hasCorrect = card.correctAnswers.some((a) => a.trim());
    const hasIncorrect = card.incorrectAnswers.some((a) => a.trim());
    return Boolean(hasFront && hasCorrect && hasIncorrect);
  }

  // classic-flip + type-answer both require a "back"
  const hasBack = card.back.trim() || card.backImageFile;
  return Boolean(hasFront && hasBack);
}
