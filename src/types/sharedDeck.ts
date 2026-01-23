// example: src/types/sharedDeck.ts
import type { UICard, DifficultyLevel } from "@/types/decks";

export type SharedDeckData = {
  shareId: string;
  userId: string;
  createdBy?: string;
  authorName?: string | null;

  name: string;
  emoji: string;
  color: string;

  category?: string | null;
  subtopic?: string | null;
  difficulty?: DifficultyLevel | null;
  deckType?: string | null;

  cards: UICard[];
};
