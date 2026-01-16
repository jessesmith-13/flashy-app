import { API_BASE } from "@/supabase/runtime";
import { useStore } from "@/shared/state/useStore";

const { fetchUserAchievements } = useStore.getState();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================================
// DECKS API
// ============================================================

export const fetchDecks = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/decks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to fetch decks:", data.error);
    throw new Error(data.error || "Failed to fetch decks");
  }

  return data.decks || [];
};

export const createDeck = async (
  accessToken: string,
  deck: {
    name: string;
    color?: string;
    emoji?: string;
    deckType?: string;
    category?: string;
    subtopic?: string;
    difficulty?: string;
    frontLanguage?: string;
    backLanguage?: string;
  }
) => {
  const response = await fetch(`${API_BASE}/decks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(deck),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to create deck:", data.error);
    throw new Error(data.error || "Failed to create deck");
  }

  // ✅ REFETCH ACHIEVEMENTS TO CHECK FOR NEW UNLOCKS
  await fetchUserAchievements();

  return data.deck;
};

export const updateDeck = async (
  accessToken: string,
  deckId: string,
  updates: Partial<{
    name: string;
    color: string;
    emoji: string;
    deckType: string;
    isFavorite: boolean;
    isLearned: boolean;
    category: string;
    subtopic: string;
    difficulty: string;
    frontLanguage: string;
    backLanguage: string;
  }>
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to update deck:", data.error);
    throw new Error(data.error || "Failed to update deck");
  }

  await fetchUserAchievements();

  return data.deck;
};

export const updateDeckPositions = async (
  accessToken: string,
  positions: { id: string; position: number }[]
) => {
  const response = await fetch(`${API_BASE}/decks/positions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ positions }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to update deck positions:", data.error);
    throw new Error(data.error || "Failed to update deck positions");
  }

  return data;
};

export async function deleteDeck(
  accessToken: string,
  deckId: string,
  options?: {
    reason?: string;
  }
): Promise<{
  success: boolean;
  message?: string;
  deletedFromCommunity?: boolean;
}> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(`${API_BASE}/decks/${deckId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: options?.reason
      ? JSON.stringify({ reason: options.reason })
      : undefined,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // backend may return empty body
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to delete deck");
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

export const fetchCards = async (accessToken: string, deckId: string) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to fetch cards:", data.error);
    throw new Error(data.error || "Failed to fetch cards");
  }

  return data.cards || [];
};

export const createCard = async (
  accessToken: string,
  deckId: string,
  card: {
    front: string;
    back?: string;
    cardType: string;
    correctAnswers?: string[];
    incorrectAnswers?: string[];
    acceptedAnswers?: string[];
    frontImageUrl?: string;
    backImageUrl?: string;
    frontAudio?: string;
    backAudio?: string;
  }
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(card),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to create card:", data.error);
    throw new Error(data.error || "Failed to create card");
  }

  await fetchUserAchievements();

  return data.card;
};

export const createCardsBatch = async (
  accessToken: string,
  deckId: string,
  cards: Array<{
    front: string;
    back?: string;
    cardType: string;
    correctAnswers?: string[];
    incorrectAnswers?: string[];
    acceptedAnswers?: string[];
    frontImageUrl?: string;
    backImageUrl?: string;
    frontAudio?: string;
    backAudio?: string;
  }>
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ cards }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to create cards batch:", data.error);
    throw new Error(data.error || "Failed to create cards");
  }

  await fetchUserAchievements();

  return data.cards;
};

export const updateCard = async (
  accessToken: string,
  deckId: string,
  cardId: string,
  updates: Partial<{
    front: string;
    back: string;
    cardType: string;
    incorrectAnswers: string[];
    correctAnswers: string[];
    acceptedAnswers?: string[];
    favorite?: boolean;
    isIgnored?: boolean;
    frontImageUrl?: string;
    backImageUrl?: string;
    frontAudio?: string;
    backAudio?: string;
  }>
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/${cardId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to update card:", data.error);
    throw new Error(data.error || "Failed to update card");
  }

  return data.card;
};

export const updateCardPositions = async (
  accessToken: string,
  deckId: string,
  positions: { id: string; position: number }[]
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/positions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ positions }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to update card positions:", data.error);
    throw new Error(data.error || "Failed to update card positions");
  }

  return data;
};

export async function deleteCard(
  accessToken: string,
  deckId: string,
  cardId: string
): Promise<{ success: true }> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/${cardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // backend may return empty JSON on success
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to delete card");
  }

  return { success: true };
}

// Update an imported deck from its community source
export const updateImportedDeck = async (
  accessToken: string,
  deckId: string,
  communityDeckData: {
    name: string;
    color: string;
    emoji: string;
    cards: any[];
    category?: string;
    subtopic?: string;
    version: number;
  }
) => {
  const response = await fetch(
    `${API_BASE}/decks/${deckId}/update-from-community`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(communityDeckData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to update imported deck:", data.error);
    throw new Error(data.error || "Failed to update imported deck");
  }

  return data.deck;
};

// Create share link for a deck
export const createShareLink = async (
  accessToken: string,
  deckId: string,
  isCommunityDeck: boolean
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ isCommunityDeck }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to create share link:", data.error);
    throw new Error(data.error || "Failed to create share link");
  }

  return data;
};

// Get shared deck
export const getSharedDeck = async (shareId: string) => {
  console.log("getSharedDeck - Making request for shareId:", shareId);
  console.log("getSharedDeck - API_BASE:", API_BASE);

  const response = await fetch(`${API_BASE}/decks/shared/${shareId}`, {
    headers: {
      Authorization: `Bearer ${anonKey}`,
    },
  });

  console.log("getSharedDeck - Response status:", response.status);
  const data = await response.json();
  console.log("getSharedDeck - Response data:", data);

  if (!response.ok) {
    console.error("Failed to get shared deck:", data.error);
    throw new Error(data.error || "Failed to get shared deck");
  }

  return data.deck;
};

// Add shared deck to user's library
export const addSharedDeckToLibrary = async (
  accessToken: string,
  shareId: string
) => {
  console.log("addSharedDeckToLibrary - shareId:", shareId);

  const response = await fetch(`${API_BASE}/shared/${shareId}/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("addSharedDeckToLibrary - Response:", data);

  if (!response.ok) {
    console.error("Failed to add shared deck:", data.error);
    throw new Error(data.error || "Failed to add shared deck");
  }

  return data.deck;
};
