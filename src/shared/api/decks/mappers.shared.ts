// src/shared/api/decks/mappers.shared.ts

import type { ApiDeck, ApiCard } from "./types.api";
import type { SharedDeckData } from "@/types/sharedDeck";
import { mapApiDeckToUIDeck, mapApiCardToUICard } from "./mappers";

type SharedDeckApiResponse = {
  shareId?: string;
  share_id?: string;
  createdAt?: string;
  created_at?: string;
  deck?: unknown; // could be snake/camel; we'll validate below
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return null;
}

function pickArray(obj: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export function mapSharedDeckApiToSharedDeckData(
  shareIdParam: string,
  payload: SharedDeckApiResponse,
): SharedDeckData {
  if (!payload.deck || !isRecord(payload.deck)) {
    throw new Error("Malformed response: missing deck");
  }

  const deckRecord = payload.deck;

  // ✅ normal deck mapping remains untouched
  const uiDeck = mapApiDeckToUIDeck(
    deckRecord as ApiDeck | Record<string, unknown>,
  );

  // ✅ cards live on the shared snapshot, not in UIDeck
  const rawCards = pickArray(deckRecord, "cards");
  const cards = rawCards
    .filter(isRecord)
    .map((c) => mapApiCardToUICard(c as ApiCard | Record<string, unknown>));

  // ✅ authorName is a shared-only field; do NOT put it in UIDeck mapping
  const authorName =
    pickString(deckRecord, "authorName", "author_name") ?? null;

  return {
    shareId: payload.shareId ?? payload.share_id ?? shareIdParam,
    userId: uiDeck.userId,
    createdBy: uiDeck.userId,
    authorName,

    name: uiDeck.name,
    emoji: uiDeck.emoji,
    color: uiDeck.color,
    category: uiDeck.category ?? null,
    subtopic: uiDeck.subtopic ?? null,
    difficulty: uiDeck.difficulty ?? null,
    deckType:
      (deckRecord["deckType"] as string | null) ??
      (deckRecord["deck_type"] as string | null) ??
      null,

    cards,
  };
}
