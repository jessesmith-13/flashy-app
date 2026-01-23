export type CommunityDeck = {
  id: string;
  owner_id: string;

  owner_name: string | null;
  owner_display_name: string | null;
  owner_avatar: string | null;

  original_deck_id: string | null;

  version: number;

  name: string;
  color: string | null;
  emoji: string | null;

  category: string | null;
  subtopic: string | null;
  difficulty: string | null;

  front_language: string | null;
  back_language: string | null;

  card_count: number | null;
  import_count: number | null;
  average_rating: number | null;
  rating_count: number | null;
  download_count: number | null;

  featured: boolean | null;

  is_public?: boolean | null;
  is_published: boolean;
  publish_banned?: boolean | null;
  publish_banned_reason?: string | null;
  is_deleted: boolean;
  is_flagged?: boolean | null;

  source_community_deck_id?: string | null;
  imported_from_version?: number | null;

  source_content_updated_at: string | null;

  published_at: string | null;
  created_at: string;
  updated_at: string;

  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
};

export type CommunityCard = {
  id: string;
  community_deck_id: string;

  front: string | null;
  back: string | null;

  card_type: "classic-flip" | "multiple-choice" | "type-answer";

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

export type CommunityCardInsert = {
  community_deck_id: string;
  position: number;

  front: string | null;
  back: string | null;
  card_type: "classic-flip" | "multiple-choice" | "type-answer";

  correct_answers: string[] | null;
  incorrect_answers: string[] | null;
  accepted_answers: string[] | null;

  audio_url: string | null;
  front_image_url: string | null;
  back_image_url: string | null;

  front_audio: string | null;
  back_audio: string | null;

  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  community_deck_id: string;
  user_id: string;
  content: string;
  user_name: string;
  user_display_name: string;
  user_avatar: string | null;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  is_flagged: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
};

export type Reply = {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  user_name: string;
  user_display_name: string;
  user_avatar: string | null;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  is_flagged: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
};

// API response types (not DB rows)
export type ReplyResponse = {
  id: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  userAvatar: string | null;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  communityDeckId: string;
};

export type CommentResponse = {
  id: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  userAvatar: string | null;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  replies: ReplyResponse[];
};
