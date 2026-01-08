export type CommunityDeckDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'mixed'
  | null

export interface CommunityDeck {
  id: string
  owner_id: string

  original_deck_id: string | null

  name: string
  description: string | null
  category: string | null
  subtopic: string | null

  card_count: number
  import_count: number

  featured: boolean
  is_flagged: boolean
  is_published: boolean
  is_deleted: boolean

  version: number

  owner_name: string | null
  owner_display_name: string | null
  owner_avatar: string | null

  average_rating: number | null
  rating_count: number

  front_language: string | null
  back_language: string | null
  color: string | null
  emoji: string | null
  difficulty: CommunityDeckDifficulty

  published_at: string | null
  created_at: string
  updated_at: string

  download_count: number

  // UI-derived / aggregated fields (safe & optional)
  commentCount?: number
  source_content_updated_at: string | null
}

export type UICommunityDeck = CommunityDeck & {
  id: string
  ownerId: string

  originalDeckId: string | null

  name: string
  description: string | null
  category: string | null
  subtopic: string | null

  cardCount: number
  importCount: number

  featured: boolean
  isFlagged: boolean
  isPublished: boolean
  isDeleted: boolean

  version: number

  ownerName: string | null
  ownerDisplayName: string | null
  ownerAvatar: string | null

  averageRating: number | null
  ratingCount: number

  frontLanguage: string | null
  backLanguage: string | null
  color: string | null
  emoji: string | null
  difficulty: CommunityDeckDifficulty

  publishedAt: string | null
  createdAt: string
  updatedAt: string

  downloadCount: number

  // UI-derived / aggregated fields (safe & optional)
  commentCount?: number
  cards: UICommunityCard[]
  sourceContentUpdatedAt: string | null
}

export type CommunityCard = {
  id: string
  community_deck_id: string

  front: string | null
  back: string | null

  card_type: 'classic-flip' | 'multiple-choice' | 'type-answer'

  correct_answers: string[] | null
  incorrect_answers: string[] | null
  accepted_answers: string[] | null

  audio_url: string | null

  front_image_url: string | null
  back_image_url: string | null

  front_audio: string | null
  back_audio: string | null

  position: number

  is_flagged: boolean
  is_deleted: boolean
  deleted_at: string | null
  deleted_reason: string | null
  deleted_by: string | null
  deleted_by_name: string | null
  created_at: string
  updated_at: string
}

export type UICommunityCard = {
  id: string
  communityDeckId: string

  front: string | null
  back: string | null

  cardType: 'classic-flip' | 'multiple-choice' | 'type-answer'

  correctAnswers: string[] | null
  incorrectAnswers: string[] | null
  acceptedAnswers: string[] | null

  audioUrl: string | null

  frontImage_url: string | null
  backImage_url: string | null

  frontAudio: string | null
  backAudio: string | null

  position: number

  isFlagged: boolean
  isDeleted: boolean
  deletedAt: string | null
  deletedReason: string | null
  deletedBy: string | null
  deletedByName: string | null
  createdAt: string
  updatedAt: string
  favorite: boolean
  isIgnored: boolean
  deckId: string
}

export type Comment = {
  id: string
  communityDeckId: string
  userId: string
  content: string
  userName: string
  userDisplayName: string
  userAvatar: string | null
  createdAt: string
  updatedAt: string | null
  isDeleted: boolean
  isFlagged: boolean
  deletedAt: string | null
  deletedBy: string | null
  deletedReason: string | null
  likes: number
  replies: Reply[]
}

export type Reply = {
  id: string
  commentId: string
  userId: string
  content: string
  userName: string
  userDisplayName: string
  userAvatar: string | null
  createdAt: string
  updatedAt: string | null
  isDeleted: boolean
  isFlagged: boolean
  deletedAt: string | null
  deletedBy: string | null
  deletedReason: string | null
  communityDeckId: string
}