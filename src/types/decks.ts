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
  audio_url: string | null
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
  updatedAt: string
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'mixed';