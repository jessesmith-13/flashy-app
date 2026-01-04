export type GeneratedCardType = {
  front: string
  back: string
  cardType: 'classic-flip' | 'multiple-choice' | 'type-answer'
  incorrectAnswers?: string[]
  correctAnswers?: string[]
  acceptedAnswers?: string[]
  frontAudio?: string
  backAudio?: string
}

export type CardType =
  | 'classic-flip'
  | 'multiple-choice'
  | 'type-answer'