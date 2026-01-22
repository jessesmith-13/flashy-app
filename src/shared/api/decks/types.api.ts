// src/shared/api/decks/types.api.ts

import type {
  UnsplashAttribution,
  DifficultyLevel,
  CardType,
  UICard,
} from "@/types/decks";

/**
 * ============================================================
 * API TYPES (snake_case)
 * ============================================================
 * These types represent the backend contract.
 * Even if the backend sometimes returns camelCase, we still model the
 * canonical shapes here as snake_case and handle tolerance in mappers.ts.
 */

export type ApiErrorResponse = {
  error?: string;
  message?: string;
};

export type ApiDeck = {
  id: string;
  name: string;
  emoji: string;
  color: string;

  category?: string | null;
  subtopic?: string | null;

  user_id: string;
  is_public: boolean;

  created_at: string;
  updated_at: string;

  card_count: number;

  difficulty: DifficultyLevel;

  source_community_deck_id?: string | null;
  community_published_id?: string | null;

  front_language?: string | null;
  back_language?: string | null;

  is_published: boolean;
  is_favorite?: boolean;
  is_learned?: boolean;
  is_community?: boolean;
  is_deleted?: boolean;
  is_shared?: boolean;

  position?: number;

  deleted_at?: string | null;

  // sync/versioning (your UIDeck has these; backend may provide them)
  community_deck_version?: number | null;
  imported_from_version?: number | null;
  last_synced_at?: string | null;

  // moderation
  publish_banned?: boolean;
  publish_banned_reason?: string | null;

  // allow backend additions without breaking compilation
  [k: string]: unknown;
};

export type ApiCard = {
  id: string;
  deck_id: string;

  card_type: CardType;

  front: string | null;
  back?: string | null;

  correct_answers: string[] | null;
  incorrect_answers: string[] | null;
  accepted_answers: string[] | null;

  front_image_url: string | null;
  back_image_url: string | null;

  front_image_attribution: UnsplashAttribution | null;
  back_image_attribution: UnsplashAttribution | null;

  front_audio: string | null;
  back_audio: string | null;

  position: number;
  favorite: boolean;
  is_ignored: boolean;

  created_at: string;

  [k: string]: unknown;
};

// ---------- responses ----------

export type FetchDecksResponse = ApiErrorResponse & {
  decks?: ApiDeck[];
};

export type CreateDeckResponse = ApiErrorResponse & {
  deck?: ApiDeck;
};

export type UpdateDeckResponse = ApiErrorResponse & {
  deck?: ApiDeck;
};

export type DeleteDeckResponse = ApiErrorResponse & {
  success?: boolean;
  message?: string;
};

export type FetchCardsResponse = ApiErrorResponse & {
  cards?: ApiCard[];
};

export type CreateCardResponse = ApiErrorResponse & {
  card?: ApiCard;
};

export type CreateCardsBatchResponse = ApiErrorResponse & {
  cards?: ApiCard[];
};

export type UpdateCardResponse = ApiErrorResponse & {
  card?: ApiCard;
};

export type DeleteCardResponse = ApiErrorResponse & {
  success?: boolean;
};

// share
export type CreateShareLinkResponse = ApiErrorResponse & {
  share_id?: string;
  url?: string;
  [k: string]: unknown;
};

export type GetSharedDeckResponse = ApiErrorResponse & {
  deck?: ApiDeck;
};

export type AddSharedDeckToLibraryResponse = ApiErrorResponse & {
  deck?: ApiDeck;
};

// ---------- payloads we send (camelCase, since that's what your callers use) ----------

export type CreateDeckPayload = {
  name: string;
  color?: string;
  emoji?: string;

  // NOTE: your Deck/UIDeck type doesn't currently contain deckType,
  // but your API functions accept it. Keep it optional and pass-through.
  deckType?: string;

  category?: string;
  subtopic?: string;
  difficulty?: DifficultyLevel;

  frontLanguage?: string;
  backLanguage?: string;
};

export type UpdateDeckPayload = Partial<{
  name: string;
  color: string;
  emoji: string;

  deckType: string;

  isFavorite: boolean;
  isLearned: boolean;

  category: string;
  subtopic: string;

  difficulty: DifficultyLevel;

  frontLanguage: string;
  backLanguage: string;
}>;

export type UpdateDeckPositionsPayload = { id: string; position: number }[];

export type DeleteDeckOptions = { reason?: string };

export type CreateCardPayload = {
  front: string;
  back?: string;
  cardType: CardType;

  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];

  frontImageUrl?: string;
  backImageUrl?: string;

  frontAudio?: string;
  backAudio?: string;

  // NOTE: You don't include attribution on create/update currently.
  // Add later if you want: frontImageAttribution/backImageAttribution.
};

export type UpdateCardPayload = Partial<{
  front: string;
  back: string;
  cardType: CardType;

  incorrectAnswers: string[];
  correctAnswers: string[];
  acceptedAnswers?: string[];

  favorite?: boolean;
  isIgnored?: boolean;

  frontImageUrl?: string;
  backImageUrl?: string;

  frontAudio?: string;
  backAudio?: string;
}>;

export type UpdateCardPositionsPayload = { id: string; position: number }[];

/**
 * This is the payload you currently send to update-from-community.
 * You're passing Card[] (snake_case-ish fields), so keep it typed as Card[].
 */
export type UpdateImportedDeckPayload = {
  name: string;
  color: string;
  emoji: string;
  cards: UICard[];
  category?: string;
  subtopic?: string;
  version: number;
};
