import type { ApiCard } from "@/types/decks";
import type { UICard as StoreCard } from "@/types/decks";

export function mapApiCardToStoreCard(api: ApiCard): StoreCard {
  return {
    id: api.id,
    deckId: api.deck_id,

    front: api.front ?? "",
    back: api.back ?? "",

    createdAt: api.created_at,
    position: api.position,

    cardType: api.card_type,

    favorite: api.favorite,
    isIgnored: api.is_ignored,

    frontImageUrl: api.front_image_url ?? undefined,
    backImageUrl: api.back_image_url ?? undefined,
    frontImageAttribution: api.front_image_attribution ?? undefined,
    backImageAttribution: api.back_image_attribution ?? undefined,

    backAudio: api.back_audio ?? undefined,
    frontAudio: api.front_audio ?? undefined,

    incorrectAnswers: api.incorrect_answers ?? undefined,
    correctAnswers: api.correct_answers ?? undefined, // ← Remove the array wrapping
    acceptedAnswers: api.accepted_answers ?? undefined,
  };
}
