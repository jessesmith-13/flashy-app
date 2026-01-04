export interface StudySession {
  id: string
  userId: string
  deckId: string

  date: string

  correctAnswers: number
  totalQuestions: number
  score: number

  durationMinutes: number | null

  createdAt: string
  updatedAt: string

  startedAt: string | null
  endedAt: string | null

  cardsStudied: number | null
  correctCount: number | null
  incorrectCount: number | null
  skippedCount: number | null

  studyMode: string | null
  timeSpentSeconds: number | null

  sessionData: Record<string, unknown> | null
}

export interface StudySessionPayload {
  id?: string
  deckId: string
  startedAt?: string
  endedAt?: string
  cardsStudied: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
  timeSpentSeconds: number
  mode?: string
  sessionData?: unknown
}