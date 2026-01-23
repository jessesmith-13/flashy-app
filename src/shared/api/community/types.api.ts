// src/shared/api/community/types.api.ts

import type { CommunityDeckDifficulty } from "@/types/community";
import type { UICommunityCard } from "@/types/community";

// -----------------------------
// API (raw) shapes — tolerant of snake OR camel
// -----------------------------

export type CommunityCardApiInput = Partial<{
  // ids
  id: string;
  community_deck_id: string;
  communityDeckId: string;

  // content
  front: string | null;
  back: string | null;
  card_type: UICommunityCard["cardType"];
  cardType: UICommunityCard["cardType"];

  // answers
  correct_answers: string[] | null;
  incorrect_answers: string[] | null;
  accepted_answers: string[] | null;
  correctAnswers: string[] | null;
  incorrectAnswers: string[] | null;
  acceptedAnswers: string[] | null;

  // media
  audio_url: string | null;
  audioUrl: string | null;

  front_image_url: string | null;
  back_image_url: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;

  front_audio: string | null;
  back_audio: string | null;
  frontAudio: string | null;
  backAudio: string | null;

  // misc
  position: number;
  is_flagged: boolean;
  isFlagged: boolean;
  is_deleted: boolean;
  isDeleted: boolean;

  deleted_at: string | null;
  deleted_reason: string | null;
  deleted_by: string | null;
  deleted_by_name: string | null;

  deletedAt: string | null;
  deletedReason: string | null;
  deletedBy: string | null;
  deletedByName: string | null;

  created_at: string;
  updated_at: string;
  createdAt: string;
  updatedAt: string;
}>;

export type CommunityDeckApiInput = Partial<{
  // ids
  id: string;
  owner_id: string;
  ownerId: string;

  original_deck_id: string | null;
  originalDeckId: string | null;

  // core
  name: string;
  description: string | null;
  category: string | null;
  subtopic: string | null;

  // counts/flags
  card_count: number;
  cardCount: number;

  import_count: number;
  importCount: number;

  featured: boolean;

  is_flagged: boolean;
  isFlagged: boolean;
  is_published: boolean;
  isPublished: boolean;
  is_deleted: boolean;
  isDeleted: boolean;

  // version/ratings
  version: number;
  average_rating: number | null;
  averageRating: number | null;
  rating_count: number;
  ratingCount: number;

  // owner
  owner_name: string | null;
  ownerName: string | null;
  owner_display_name: string | null;
  ownerDisplayName: string | null;
  owner_avatar: string | null;
  ownerAvatar: string | null;

  // locale/style
  front_language: string | null;
  back_language: string | null;
  frontLanguage: string | null;
  backLanguage: string | null;

  color: string | null;
  emoji: string | null;
  difficulty: CommunityDeckDifficulty;

  // times
  published_at: string | null;
  created_at: string;
  updated_at: string;

  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // download + derived
  download_count: number;
  downloadCount: number;

  comment_count: number;
  commentCount: number;

  source_content_updated_at: string | null;
  sourceContentUpdatedAt: string | null;

  // cards (multiple possible keys during transition)
  community_cards: CommunityCardApiInput[];
  communityCards: CommunityCardApiInput[];
  cards: CommunityCardApiInput[];
}>;

export type CommunityDecksResponseApi = {
  decks: CommunityDeckApiInput[];
};

export type CommunityDeckResponseApi = {
  deck: CommunityDeckApiInput | null;
};

export type CommunityCardApiPayload = {
  id: string;
  community_deck_id: string;
  front: string | null;
  back: string | null;
  card_type: string;
  correct_answers: string[] | null;
  incorrect_answers: string[] | null;
  accepted_answers: string[] | null;
  audio_url: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  front_audio: string | null;
  back_audio: string | null;
  position: number;
  is_flagged: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_reason: string | null;
  deleted_by: string | null;
  deleted_by_name: string | null;
  created_at: string;
  updated_at: string;
};
