// src/shared/api/decks/index.ts

import { API_BASE } from "@/supabase/runtime";
import { useStore } from "@/shared/state/useStore";
import type { UIDeck, UICard } from "@/types/decks";

import type {
  FetchDecksResponse,
  CreateDeckResponse,
  UpdateDeckResponse,
  DeleteDeckResponse,
  FetchCardsResponse,
  CreateCardResponse,
  CreateCardsBatchResponse,
  UpdateCardResponse,
  DeleteCardResponse,
  CreateShareLinkResponse,
  GetSharedDeckResponse,
  AddSharedDeckToLibraryResponse,
  CreateDeckPayload,
  UpdateDeckPayload,
  CreateCardPayload,
  UpdateCardPayload,
  UpdateImportedDeckPayload,
} from "./types.api";

import {
  mapApiDeckToUIDeck,
  mapApiDecksToUIDecks,
  mapApiCardToUICard,
  mapApiCardsToUICards,
} from "./mappers";

const { fetchUserAchievements } = useStore.getState();
const anonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ============================================================
// DECKS API
// ============================================================

export async function fetchDecks(accessToken: string): Promise<UIDeck[]> {
  const res = await fetch(`${API_BASE}/decks`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<FetchDecksResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to fetch decks";
    throw new Error(msg);
  }

  return mapApiDecksToUIDecks(data?.decks ?? []);
}

export async function createDeck(
  accessToken: string,
  deck: CreateDeckPayload,
): Promise<UIDeck> {
  const res = await fetch(`${API_BASE}/decks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(deck),
  });

  const data = await readJson<CreateDeckResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to create deck";
    throw new Error(msg);
  }

  await fetchUserAchievements();

  if (!data?.deck) throw new Error("Malformed response: missing deck");
  return mapApiDeckToUIDeck(data.deck);
}

export async function updateDeck(
  accessToken: string,
  deckId: string,
  updates: UpdateDeckPayload,
): Promise<UIDeck> {
  const res = await fetch(`${API_BASE}/decks/${deckId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await readJson<UpdateDeckResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to update deck";
    throw new Error(msg);
  }

  await fetchUserAchievements();

  if (!data?.deck) throw new Error("Malformed response: missing deck");
  return mapApiDeckToUIDeck(data.deck);
}

export async function updateDeckPositions(
  accessToken: string,
  positions: { id: string; position: number }[],
): Promise<{ success?: boolean; [k: string]: unknown }> {
  const res = await fetch(`${API_BASE}/decks/positions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ positions }),
  });

  const data = await readJson<Record<string, unknown>>(res);

  if (!res.ok) {
    const msg =
      (data as { error?: string })?.error || "Failed to update deck positions";
    throw new Error(msg);
  }

  return data ?? {};
}

export async function deleteDeck(
  accessToken: string,
  deckId: string,
  options?: { reason?: string },
): Promise<{
  success: boolean;
  message?: string;
  deletedFromCommunity?: boolean;
}> {
  if (!accessToken) throw new Error("Missing access token");

  const res = await fetch(`${API_BASE}/decks/${deckId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: options?.reason
      ? JSON.stringify({ reason: options.reason })
      : undefined,
  });

  const data = await readJson<DeleteDeckResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to delete deck";
    throw new Error(msg);
  }

  return {
    success: true,
    message: data?.message,
    deletedFromCommunity: Boolean(options?.reason),
  };
}

// ============================================================
// CARDS API (DECK-SCOPED)
// ============================================================

export async function fetchCards(
  accessToken: string,
  deckId: string,
): Promise<UICard[]> {
  const res = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<FetchCardsResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to fetch cards";
    throw new Error(msg);
  }

  return mapApiCardsToUICards(data?.cards ?? []);
}

export async function createCard(
  accessToken: string,
  deckId: string,
  card: CreateCardPayload,
): Promise<UICard> {
  const res = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(card),
  });

  const data = await readJson<CreateCardResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to create card";
    throw new Error(msg);
  }

  await fetchUserAchievements();

  if (!data?.card) throw new Error("Malformed response: missing card");
  return mapApiCardToUICard(data.card);
}

export async function createCardsBatch(
  accessToken: string,
  deckId: string,
  cards: CreateCardPayload[],
): Promise<UICard[]> {
  const res = await fetch(`${API_BASE}/decks/${deckId}/cards/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ cards }),
  });

  const data = await readJson<CreateCardsBatchResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to create cards";
    throw new Error(msg);
  }

  await fetchUserAchievements();

  return mapApiCardsToUICards(data?.cards ?? []);
}

export async function updateCard(
  accessToken: string,
  deckId: string,
  cardId: string,
  updates: UpdateCardPayload,
): Promise<UICard> {
  const res = await fetch(`${API_BASE}/decks/${deckId}/cards/${cardId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await readJson<UpdateCardResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to update card";
    throw new Error(msg);
  }

  if (!data?.card) throw new Error("Malformed response: missing card");
  return mapApiCardToUICard(data.card);
}

export async function updateCardPositions(
  accessToken: string,
  deckId: string,
  positions: { id: string; position: number }[],
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/decks/${deckId}/cards/positions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ positions }),
  });

  const data = await readJson<Record<string, unknown>>(res);

  if (!res.ok) {
    const msg =
      (data as { error?: string })?.error || "Failed to update card positions";
    throw new Error(msg);
  }

  return data ?? {};
}

export async function deleteCard(
  accessToken: string,
  deckId: string,
  cardId: string,
): Promise<{ success: true }> {
  if (!accessToken) throw new Error("Missing access token");

  const res = await fetch(`${API_BASE}/decks/${deckId}/cards/${cardId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<DeleteCardResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to delete card";
    throw new Error(msg);
  }

  return { success: true };
}

// Update an imported deck from its community source
export async function updateImportedDeck(
  accessToken: string,
  deckId: string,
  communityDeckData: UpdateImportedDeckPayload,
): Promise<UIDeck> {
  const res = await fetch(`${API_BASE}/decks/${deckId}/update-from-community`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(communityDeckData),
  });

  const data = await readJson<UpdateDeckResponse>(res);

  if (!res.ok) {
    const msg =
      data?.error || data?.message || "Failed to update imported deck";
    throw new Error(msg);
  }

  if (!data?.deck) throw new Error("Malformed response: missing deck");
  return mapApiDeckToUIDeck(data.deck);
}

// Create share link for a deck
export async function createShareLink(
  accessToken: string,
  deckId: string,
  isCommunityDeck: boolean,
): Promise<CreateShareLinkResponse> {
  const res = await fetch(`${API_BASE}/decks/${deckId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ isCommunityDeck }),
  });

  const data = await readJson<CreateShareLinkResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to create share link";
    throw new Error(msg);
  }

  return data ?? {};
}

// Get shared deck
export async function getSharedDeck(shareId: string): Promise<UIDeck> {
  const res = await fetch(`${API_BASE}/decks/shared/${shareId}`, {
    headers: { Authorization: `Bearer ${anonKey}` },
  });

  const data = await readJson<GetSharedDeckResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to get shared deck";
    throw new Error(msg);
  }

  if (!data?.deck) throw new Error("Malformed response: missing deck");
  return mapApiDeckToUIDeck(data.deck);
}

// Add shared deck to user's library
export async function addSharedDeckToLibrary(
  accessToken: string,
  shareId: string,
): Promise<UIDeck> {
  const res = await fetch(`${API_BASE}/shared/${shareId}/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await readJson<AddSharedDeckToLibraryResponse>(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to add shared deck";
    throw new Error(msg);
  }

  if (!data?.deck) throw new Error("Malformed response: missing deck");
  return mapApiDeckToUIDeck(data.deck);
}
