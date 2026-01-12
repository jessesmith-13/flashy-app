// Unsplash image attribution type
export interface UnsplashAttribution {
  photographerName: string;
  photographerUsername: string;
  photographerUrl: string;
  unsplashUrl: string;
  downloadUrl: string;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  card_type: "classic-flip" | "multiple-choice" | "type-answer";
  correct_answers: string[] | null;
  incorrect_answers: string[] | null;
  accepted_answers: string[] | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  front_image_attribution?: UnsplashAttribution | null;
  back_image_attribution?: UnsplashAttribution | null;
  front_audio: string | null;
  back_audio: string | null;
  created_at: string;
  is_ignored: boolean;
  favorite: boolean;
  position: number;
}

export type ApiCard = {
  id: string;
  deck_id: string;
  card_type: "classic-flip" | "multiple-choice" | "type-answer";
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
};

// types/ui.ts (or types/cards-ui.ts)
export interface UICard {
  id: string;
  front: string | null;
  back: string | null;
  cardType: "classic-flip" | "multiple-choice" | "type-answer";
  correctAnswers?: string[] | null;
  incorrectAnswers?: string[] | null;
  acceptedAnswers?: string[] | null;
  frontAudio?: string | null;
  backAudio?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  frontImageAttribution?: UnsplashAttribution | null;
  backImageAttribution?: UnsplashAttribution | null;
  position: number;
  favorite: boolean;
  isIgnored: boolean;
  deckId: string;
  createdAt: string;
}

export interface Deck {
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
  last_synced_at?: string | null;
  publish_banned?: boolean;
  publish_banned_reason?: string | null;
}

export interface UIDeck {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category?: string | null;
  subtopic?: string | null;
  userId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  difficulty: DifficultyLevel;
  sourceCommunityDeckId?: string | null;
  communityPublishedId?: string | null;
  frontLanguage?: string | null;
  backLanguage?: string | null;
  isPublished: boolean;
  isFavorite?: boolean;
  isLearned?: boolean;
  isCommunity?: boolean;
  isDeleted?: boolean;
  isShared?: boolean;
  position?: number;
  deletedAt?: string | null;
  communityDeckVersion?: number | null;
  importedFromVersion?: number | null;
  lastSyncedAt?: string | null;
  publishBanned?: boolean;
  publishBannedReason?: string | null;
}

export type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "mixed";

export type CardType = "classic-flip" | "multiple-choice" | "type-answer";

export type DeckType = "classic-flip" | "multiple-choice" | "type-answer";
