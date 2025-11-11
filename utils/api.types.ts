import type { CardType } from '../store/useStore'

export interface CreateCardInput {
  front: string
  back?: string
  cardType: CardType
  options?: string[]
  correctAnswers?: string[]
  acceptedAnswers?: string[]
  frontImageUrl?: string
  backImageUrl?: string
}

export interface UpdateCardInput {
  front?: string
  back?: string
  cardType?: string
  options?: string[]
  correctAnswers?: string[]
  acceptedAnswers?: string[]
  frontImageUrl?: string | null
  backImageUrl?: string | null
  favorite?: boolean
  ignored?: boolean
}
