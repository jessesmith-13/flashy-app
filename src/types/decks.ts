export interface Card{
  id: string
  deck_id: string
  front: string
  back: string
  card_type: 'classic-flip' | 'multiple-choice' | 'type-answer'
  correct_answers: string[] | null
  incorrect_answers: string[] | null
  accepted_answers: string[] | null
  front_audio: string | null
  back_audio: string | null
  created_at: string
  is_ignored: boolean
  favorite: boolean
}

export type ApiCard = {
  id: string
  deck_id: string
  card_type: 'classic-flip' | 'multiple-choice' | 'type-answer'
  front: string | null
  back: string | null
  correct_answers: string[] | null
  incorrect_answers: string[] | null
  accepted_answers: string[] | null
  front_image_url: string | null
  back_image_url: string | null
  front_audio: string | null
  back_audio: string | null
  position: number
  favorite: boolean
  is_ignored: boolean
  created_at: string
}

// types/ui.ts (or types/cards-ui.ts)
export interface UICard {
  id: string
  front: string
  back: string
  cardType: 'classic-flip' | 'multiple-choice' | 'type-answer'
  correctAnswers?: string[]
  incorrectAnswers?: string[]
  acceptedAnswers?: string[]
  frontAudio?: string
  backAudio?: string
  frontImageUrl?: string
  backImageUrl?: string
  position: number
  favorite: boolean
  isIgnored: boolean
  deckId: string
}

export interface Deck {
  id: string
  name: string
  emoji: string
  color: string

  category?: string | null
  subtopic?: string | null

  owner_id: string
  is_public: boolean
  created_at: string
  updated_at: string
  card_count: number
  difficulty: DifficultyLevel
  source_community_deck_id?: string | null
  front_language?: string | null
  back_language?: string | null 
}

export interface UIDeck {
  id: string
  name: string
  emoji: string
  color: string
  category?: string | null
  subtopic?: string | null
  ownerId: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  cardCount: number
  difficulty: DifficultyLevel
  sourceCommunityDeckId?: string | null
  frontLanguage?: string | null
  backLanguage?: string | null
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'mixed';

export type CardType = 'classic-flip' | 'multiple-choice' | 'type-answer'

export type DeckType = 'classic-flip' | 'multiple-choice' | 'type-answer'