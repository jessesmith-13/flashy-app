export type CommunityDeckDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "mixed"
  | null;

export type CommunityTabs = "popular" | "rating" | "newest";

// -----------------------------
// UI SHAPE (what the frontend uses; camelCase ONLY)
// -----------------------------
export type UICommunityDeck = {
  id: string;
  ownerId: string;
  originalDeckId: string | null;

  name: string;
  description: string | null;
  category: string | null;
  subtopic: string | null;

  cardCount: number;
  importCount: number;

  featured: boolean;
  isFlagged: boolean;
  isPublished: boolean;
  isDeleted: boolean;

  version: number;

  ownerName: string | null;
  ownerDisplayName: string | null;
  ownerAvatar: string | null;

  averageRating: number | null;
  ratingCount: number;

  frontLanguage: string | null;
  backLanguage: string | null;
  color: string | null;
  emoji: string | null;
  difficulty: CommunityDeckDifficulty;

  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;

  downloadCount: number;

  commentCount?: number;
  sourceContentUpdatedAt: string | null;

  cards?: UICommunityCard[];
};

// -----------------------------
// UI SHAPE (camelCase ONLY)
// -----------------------------
export type UICommunityCard = {
  id: string;
  communityDeckId: string;

  front: string | null;
  back: string | null;

  cardType: "classic-flip" | "multiple-choice" | "type-answer";

  correctAnswers: string[] | null;
  incorrectAnswers: string[] | null;
  acceptedAnswers: string[] | null;

  audioUrl: string | null;

  frontImageUrl: string | null;
  backImageUrl: string | null;

  frontAudio: string | null;
  backAudio: string | null;

  position: number;

  isFlagged: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedReason: string | null;
  deletedBy: string | null;
  deletedByName: string | null;
  createdAt: string;
  updatedAt: string;

  // UI-only fields (make optional unless you *guarantee* them everywhere)
  favorite?: boolean;
  isIgnored?: boolean;
  deckId?: string;
};

export type Comment = {
  id: string;
  communityDeckId: string;
  userId: string;
  content: string;
  userName: string;
  userDisplayName: string;
  userAvatar: string | null;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
  isFlagged: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  deletedReason: string | null;
  likes: number;
  replies: Reply[];
};

export type Reply = {
  id: string;
  commentId: string;
  userId: string;
  content: string;
  userName: string;
  userDisplayName: string;
  userAvatar: string | null;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
  isFlagged: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  deletedReason: string | null;
  communityDeckId: string;
};
