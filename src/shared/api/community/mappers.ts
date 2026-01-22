// src/shared/api/community/mappers.ts

import type { UICommunityDeck, UICommunityCard } from "@/types/community";
import type { CommunityDeckApiInput, CommunityCardApiInput } from "./types.api";

// --------- helpers (typed, no any/unknown) ----------

const pick = <T>(...vals: Array<T | undefined | null>): T | undefined => {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
};

const pickNull = <T>(...vals: Array<T | undefined | null>): T | null => {
  const v = pick(...vals);
  return v === undefined ? null : v;
};

const pickNum = (...vals: Array<number | undefined | null>): number =>
  pick(...vals) ?? 0;

const pickBool = (...vals: Array<boolean | undefined | null>): boolean =>
  pick(...vals) ?? false;

const pickStr = (...vals: Array<string | undefined | null>): string =>
  pick(...vals) ?? "";

const pickArr = <T>(...vals: Array<T[] | undefined | null>): T[] =>
  pick(...vals) ?? [];

// --------- card mapper ----------

export function mapCommunityCardApiToUI(
  input: CommunityCardApiInput,
  fallbackDeckId: string,
): UICommunityCard {
  const id = pickStr(input.id);
  const communityDeckId = pickStr(
    input.communityDeckId,
    input.community_deck_id,
    fallbackDeckId,
  );

  return {
    id,
    communityDeckId,

    front: pickNull(input.front),
    back: pickNull(input.back),

    cardType: pick(
      input.cardType,
      input.card_type,
      "classic-flip",
    ) as UICommunityCard["cardType"],

    correctAnswers: pickNull(input.correctAnswers, input.correct_answers),
    incorrectAnswers: pickNull(input.incorrectAnswers, input.incorrect_answers),
    acceptedAnswers: pickNull(input.acceptedAnswers, input.accepted_answers),

    audioUrl: pickNull(input.audioUrl, input.audio_url),

    frontImageUrl: pickNull(input.frontImageUrl, input.front_image_url),
    backImageUrl: pickNull(input.backImageUrl, input.back_image_url),

    frontAudio: pickNull(input.frontAudio, input.front_audio),
    backAudio: pickNull(input.backAudio, input.back_audio),

    position: pickNum(input.position),

    isFlagged: pickBool(input.isFlagged, input.is_flagged),
    isDeleted: pickBool(input.isDeleted, input.is_deleted),

    deletedAt: pickNull(input.deletedAt, input.deleted_at),
    deletedReason: pickNull(input.deletedReason, input.deleted_reason),
    deletedBy: pickNull(input.deletedBy, input.deleted_by),
    deletedByName: pickNull(input.deletedByName, input.deleted_by_name),

    createdAt: pickStr(input.createdAt, input.created_at),
    updatedAt: pickStr(input.updatedAt, input.updated_at),

    // UI-only fields (default safe)
    favorite: false,
    isIgnored: false,
    deckId: communityDeckId,
  };
}

// --------- deck mapper ----------

export function mapCommunityDeckApiToUI(
  input: CommunityDeckApiInput,
): UICommunityDeck {
  const id = pickStr(input.id);

  const rawCards = pickArr(
    input.cards,
    input.communityCards,
    input.community_cards,
  );

  const cards = rawCards.map((c) => mapCommunityCardApiToUI(c, id));

  return {
    // IDs
    id,
    ownerId: pickStr(input.ownerId, input.owner_id),
    originalDeckId: pickNull(input.originalDeckId, input.original_deck_id),

    // Core
    name: pickStr(input.name),
    description: pickNull(input.description),
    category: pickNull(input.category),
    subtopic: pickNull(input.subtopic),

    // Counts
    cardCount: pickNum(input.cardCount, input.card_count, cards.length),
    importCount: pickNum(input.importCount, input.import_count),

    // Flags
    featured: pickBool(input.featured),
    isFlagged: pickBool(input.isFlagged, input.is_flagged),
    isPublished: pickBool(input.isPublished, input.is_published),
    isDeleted: pickBool(input.isDeleted, input.is_deleted),

    version: pickNum(input.version) || 1,

    // Owner
    ownerName: pickNull(input.ownerName, input.owner_name),
    ownerDisplayName: pickNull(
      input.ownerDisplayName,
      input.owner_display_name,
    ),
    ownerAvatar: pickNull(input.ownerAvatar, input.owner_avatar),

    // Ratings
    averageRating: pick(input.averageRating, input.average_rating) ?? 0,
    ratingCount: pickNum(input.ratingCount, input.rating_count),

    // Locale / style
    frontLanguage: pickNull(input.frontLanguage, input.front_language),
    backLanguage: pickNull(input.backLanguage, input.back_language),
    color: pickNull(input.color),
    emoji: pickNull(input.emoji),
    difficulty: pick(input.difficulty) ?? null,

    // Times
    publishedAt: pickNull(input.publishedAt, input.published_at),
    createdAt: pickStr(input.createdAt, input.created_at),
    updatedAt: pickStr(input.updatedAt, input.updated_at),

    downloadCount: pickNum(input.downloadCount, input.download_count),

    commentCount: pickNum(input.commentCount, input.comment_count),

    sourceContentUpdatedAt: pickNull(
      input.sourceContentUpdatedAt,
      input.source_content_updated_at,
    ),

    // Cards
    cards,
  };
}

export function mapCommunityDeckListApiToUI(
  decks: CommunityDeckApiInput[] | undefined | null,
): UICommunityDeck[] {
  return (decks ?? []).map(mapCommunityDeckApiToUI);
}
