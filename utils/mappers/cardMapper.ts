import type { ApiCard } from '../../src/types/decks'
import type { UICard as StoreCard } from '../../src/types/decks'

export function mapApiCardToStoreCard(
  api: ApiCard
): StoreCard {
  return {
    id: api.id,
    deckId: api.deck_id,

    front: api.front ?? '',
    back: api.back ?? '',

    createdAt: api.created_at,
    position: api.position,

    cardType: api.card_type,

    favorite: api.favorite,
    ignored: api.is_ignored,

    frontImageUrl: api.front_image_url ?? undefined,
    backImageUrl: api.back_image_url ?? undefined,

    // You only have ONE audio_url in DB
    // Decide where it belongs (usually back)
    backAudio: api.back_audio ?? undefined,
    frontAudio: api.front_audio ?? undefined,

    incorrectAnswers: api.incorrect_answers ?? undefined,

    correctAnswers: api.correct_answers
      ? [api.correct_answers]
      : undefined,

    acceptedAnswers: api.accepted_answers ?? undefined
  }
}