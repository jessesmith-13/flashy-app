import { API_BASE } from "@/supabase/runtime";
import type { StudySession, StudySessionPayload } from "@/types/study";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type StudySessionRow = {
  id: string;
  user_id: string;
  deck_id: string;
  date: string;
  correct_answers: number;
  incorrect_answers: number;
  total_questions: number;
  score: number;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  cards_studied: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  skipped_count: number | null;
  study_mode: string | null;
  time_spent_seconds: number | null;
  session_data: Record<string, unknown> | null;
};

const mapStudySession = (row: StudySessionRow): StudySession => ({
  id: row.id,
  userId: row.user_id,
  deckId: row.deck_id,
  date: row.date,
  correctAnswers: row.correct_answers,
  incorrectAnswers: row.incorrect_answers,
  totalQuestions: row.total_questions,
  score: row.score,
  durationMinutes: row.duration_minutes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  cardsStudied: row.cards_studied,
  correctCount: row.correct_count,
  incorrectCount: row.incorrect_count,
  skippedCount: row.skipped_count,
  studyMode: row.study_mode,
  timeSpentSeconds: row.time_spent_seconds,
  sessionData: row.session_data,
  timeSpent: row.time_spent_seconds ?? 0,
});

/**
 * ============================================================
 * STUDY API
 * ============================================================
 */

export const fetchStudySessions = async (
  accessToken: string,
): Promise<StudySession[]> => {
  const response = await fetch(`${API_BASE}/study/sessions`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch study sessions");
  }

  return (data.sessions ?? []).map(mapStudySession);
};

export const saveStudySessionApi = async (
  accessToken: string,
  session: StudySessionPayload,
) => {
  const response = await fetch(`${API_BASE}/study/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify(session),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to save study session:", data);
    throw new Error(data.error || "Failed to save study session");
  }

  return data.session;
};
