export interface DeckRow {
  id: string
  user_id: string
  name: string
  position: number
}

export interface CardRow {
  id: string
  deck_id: string
  position: number
}

export type Deck = {
  id: string
  user_id: string
  creator_id: string | null

  name: string
  color: string
  emoji: string

  deck_type: 'classic-flip' | 'multiple-choice' | 'type-answer'

  category: string | null
  subtopic: string | null
  difficulty: string | null

  front_language: string | null
  back_language: string | null

  card_count: number
  position: number

  is_public: boolean
  is_published: boolean
  publish_banned: boolean
  publish_banned_reason: string | null

  source_community_deck_id: string | null
  imported_from_version: number | null

  created_at: string
  updated_at: string
}

export type Card = {
  id: string
  deck_id: string

  card_type: 'classic-flip' | 'multiple-choice' | 'type-answer'
  front: string | null
  back: string | null
  correct_answer: string | null
  incorrect_answers: string[] | null
  accepted_answers: string[] | null

  front_image_url: string | null
  back_image_url: string | null

  audio_url: string | null

  position: number
  status: string | null
  favorite: boolean
  is_ignored: boolean
  times_reviewed: number
  times_correct: number
  deleted: boolean
  deleted_at: string | null

  created_at: string
  updated_at: string
}

export type CreateDeckBody = {
  name: string
  color?: string
  emoji?: string
  deckType?: Deck['deck_type']
  category?: string
  subtopic?: string
  difficulty?: string
  frontLanguage?: string
  backLanguage?: string
}

export type UpdateDeckPositionsBody = {
  positions: { id: string; position: number }[]
}

export type CreateCardBody = {
  front?: string
  back?: string
  cardType: Card['card_type']
  options?: string[]
  acceptedAnswers?: string[]
  frontImageUrl?: string
  backImageUrl?: string
}

export type CardType = 'classic-flip' | 'multiple-choice' | 'type-answer'