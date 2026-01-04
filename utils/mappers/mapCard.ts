// utils/mapCard.ts
import type { Card, UICard } from '@/types/decks'

export function mapApiCardToUICard(card: Card): UICard {
  return {
    id: card.id,
    front: card.front,
    back: card.back,
    cardType: card.card_type,
    correctAnswers: card.correct_answers ?? undefined,
    incorrectAnswers: card.incorrect_answers ?? undefined,
    acceptedAnswers: card.accepted_answers ?? undefined,
    frontAudio: card.front_audio ?? undefined,
    backAudio: card.back_audio ?? undefined,
  }
}