import { CardType } from "./decks.ts";

export type GenerateChatBody = {
  topic: string;
  numCards: number | string;
  includeImages?: boolean;
  difficulty?: "beginner" | "intermediate" | "advanced" | "expert" | "mixed";
  frontLanguage?: string;
  backLanguage?: string;
  cardTypes?: {
    classicFlip?: boolean;
    multipleChoice?: boolean;
    typeAnswer?: boolean;
  };
};

export type CardType = "classic-flip" | "multiple-choice" | "type-answer";

export interface GeneratedCard {
  front: string;
  back?: string;
  cardType: CardType;
  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];
  frontAudio?: string;
  backAudio?: string;
  imageUrl?: string; // ✅ Added for Unsplash images (legacy, kept for compatibility)
  frontImageUrl?: string; // ✅ NEW: Image for front/question (multiple-choice, type-answer)
  backImageUrl?: string; // ✅ NEW: Image for back/answer (classic-flip)
  unsplashQuery?: string; // 🔍 AI-generated optimized search query (internal use only)
}
