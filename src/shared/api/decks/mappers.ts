// src/shared/api/decks/mappers.ts

import type { ApiDeck, ApiCard } from "./types.api";
import type {
  UIDeck,
  UICard,
  DifficultyLevel,
  CardType,
  UnsplashAttribution,
} from "@/types/decks";

/**
 * Prefer snake_case key first, fall back to camelCase.
 * This is what keeps things "non breaking" if backend changes casing.
 */
function pick<T>(
  obj: Record<string, unknown>,
  snakeKey: string,
  camelKey?: string,
): T | undefined {
  const camel = camelKey ?? snakeToCamel(snakeKey);
  const v = obj[snakeKey] ?? obj[camel];
  return v as T | undefined;
}

function snakeToCamel(s: string) {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asDifficulty(v: unknown): DifficultyLevel | null {
  const ok: DifficultyLevel[] = [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
    "mixed",
  ];

  if (v == null) return null; // handles undefined + null

  return ok.includes(v as DifficultyLevel) ? (v as DifficultyLevel) : null;
}

function asCardType(v: unknown): CardType {
  const ok: CardType[] = ["classic-flip", "multiple-choice", "type-answer"];
  return ok.includes(v as CardType) ? (v as CardType) : "classic-flip";
}

// ------------------ Deck ------------------

export function mapApiDeckToUIDeck(
  input: ApiDeck | Record<string, unknown>,
): UIDeck {
  const d = input as Record<string, unknown>;

  const id = asString(pick<string>(d, "id"), "");
  const userId = asString(pick<string>(d, "user_id", "userId"), "");
  const name = asString(pick<string>(d, "name"), "");
  const emoji = asString(pick<string>(d, "emoji"), "📚");
  const color = asString(pick<string>(d, "color"), "#10B981");

  const category = pick<string | null>(d, "category", "category") ?? null;
  const subtopic = pick<string | null>(d, "subtopic", "subtopic") ?? null;

  const isPublic = asBool(pick<boolean>(d, "is_public", "isPublic"), false);
  const createdAt = asString(
    pick<string>(d, "created_at", "createdAt"),
    new Date().toISOString(),
  );
  const updatedAt = asString(
    pick<string>(d, "updated_at", "updatedAt"),
    createdAt,
  );

  const cardCount = asNumber(pick<number>(d, "card_count", "cardCount"), 0);

  const difficulty = asDifficulty(pick<unknown>(d, "difficulty", "difficulty"));

  const sourceCommunityDeckId =
    pick<string | null>(
      d,
      "source_community_deck_id",
      "sourceCommunityDeckId",
    ) ?? null;

  const communityPublishedId =
    pick<string | null>(d, "community_published_id", "communityPublishedId") ??
    null;

  const frontLanguage =
    pick<string | null>(d, "front_language", "frontLanguage") ?? null;
  const backLanguage =
    pick<string | null>(d, "back_language", "backLanguage") ?? null;

  const isPublished = asBool(
    pick<boolean>(d, "is_published", "isPublished"),
    false,
  );

  const isFavorite = pick<boolean>(d, "is_favorite", "isFavorite");
  const isLearned = pick<boolean>(d, "is_learned", "isLearned");
  const isCommunity = pick<boolean>(d, "is_community", "isCommunity");
  const isDeleted = pick<boolean>(d, "is_deleted", "isDeleted");
  const isShared = pick<boolean>(d, "is_shared", "isShared");

  const position = pick<number>(d, "position", "position");

  const deletedAt = pick<string | null>(d, "deleted_at", "deletedAt") ?? null;

  const communityDeckVersion =
    pick<number | null>(d, "community_deck_version", "communityDeckVersion") ??
    null;

  const importedFromVersion =
    pick<number | null>(d, "imported_from_version", "importedFromVersion") ??
    null;

  const lastSyncedAt =
    pick<string | null>(d, "last_synced_at", "lastSyncedAt") ?? null;

  const publishBanned = pick<boolean>(d, "publish_banned", "publishBanned");
  const publishBannedReason =
    pick<string | null>(d, "publish_banned_reason", "publishBannedReason") ??
    null;

  // Build a REAL UIDeck (no casts)
  const ui: UIDeck = {
    id,
    userId,
    name,
    emoji,
    color,

    category,
    subtopic,

    isPublic,
    createdAt,
    updatedAt,
    cardCount,
    difficulty,

    sourceCommunityDeckId,
    communityPublishedId,
    frontLanguage,
    backLanguage,

    isPublished,

    // optional fields (only attach if defined to avoid noisy undefineds)
    ...(typeof isFavorite === "boolean" ? { isFavorite } : {}),
    ...(typeof isLearned === "boolean" ? { isLearned } : {}),
    ...(typeof isCommunity === "boolean" ? { isCommunity } : {}),
    ...(typeof isDeleted === "boolean" ? { isDeleted } : {}),
    ...(typeof isShared === "boolean" ? { isShared } : {}),
    ...(typeof position === "number" ? { position } : {}),
    ...(deletedAt !== null ? { deletedAt } : {}),
    ...(communityDeckVersion !== null ? { communityDeckVersion } : {}),
    ...(importedFromVersion !== null ? { importedFromVersion } : {}),
    ...(lastSyncedAt !== null ? { lastSyncedAt } : {}),
    ...(typeof publishBanned === "boolean" ? { publishBanned } : {}),
    ...(publishBannedReason !== null ? { publishBannedReason } : {}),
  };

  return ui;
}

export function mapApiDecksToUIDecks(
  decks: Array<ApiDeck | Record<string, unknown>>,
): UIDeck[] {
  return decks.map(mapApiDeckToUIDeck);
}

// ------------------ Card ------------------

export function mapApiCardToUICard(
  input: ApiCard | Record<string, unknown>,
): UICard {
  const c = input as Record<string, unknown>;

  const id = asString(pick<string>(c, "id"), "");
  const deckId = asString(pick<string>(c, "deck_id", "deckId"), "");

  const cardType = asCardType(pick<string>(c, "card_type", "cardType"));

  const front = pick<string | null>(c, "front", "front") ?? null;
  const back = pick<string | null>(c, "back", "back") ?? null;

  const correctAnswers =
    pick<string[] | null>(c, "correct_answers", "correctAnswers") ?? null;
  const incorrectAnswers =
    pick<string[] | null>(c, "incorrect_answers", "incorrectAnswers") ?? null;
  const acceptedAnswers =
    pick<string[] | null>(c, "accepted_answers", "acceptedAnswers") ?? null;

  const frontImageUrl =
    pick<string | null>(c, "front_image_url", "frontImageUrl") ?? null;
  const backImageUrl =
    pick<string | null>(c, "back_image_url", "backImageUrl") ?? null;

  const frontImageAttribution =
    pick<UnsplashAttribution | null>(
      c,
      "front_image_attribution",
      "frontImageAttribution",
    ) ?? null;
  const backImageAttribution =
    pick<UnsplashAttribution | null>(
      c,
      "back_image_attribution",
      "backImageAttribution",
    ) ?? null;

  const frontAudio =
    pick<string | null>(c, "front_audio", "frontAudio") ?? null;
  const backAudio = pick<string | null>(c, "back_audio", "backAudio") ?? null;

  const position = asNumber(pick<number>(c, "position", "position"), 0);
  const favorite = asBool(pick<boolean>(c, "favorite", "favorite"), false);
  const isIgnored = asBool(pick<boolean>(c, "is_ignored", "isIgnored"), false);

  const createdAt = asString(
    pick<string>(c, "created_at", "createdAt"),
    new Date().toISOString(),
  );

  const ui: UICard = {
    id,
    deckId,
    front,
    back,
    cardType,
    correctAnswers,
    incorrectAnswers,
    acceptedAnswers,
    frontImageUrl,
    backImageUrl,
    frontImageAttribution,
    backImageAttribution,
    frontAudio,
    backAudio,
    position,
    favorite,
    isIgnored,
    createdAt,
  };

  return ui;
}

export function mapApiCardsToUICards(
  cards: Array<ApiCard | Record<string, unknown>>,
): UICard[] {
  return cards.map(mapApiCardToUICard);
}
