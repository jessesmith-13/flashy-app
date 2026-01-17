// src/shared/api/betaTesting/index.ts
import { apiRequest, jsonBody, JsonObject } from "@/shared/api/_client";
import type {
  BetaTaskStatus,
  BetaTestingTask,
  BetaTestingStats,
} from "@/types/betaTesting";
import type { BetaTestingTaskApi, BetaTestingStatsApi } from "./types.api";
import { mapBetaTestingTask, mapBetaTestingStats } from "./mappers";

/**
 * Get all beta testing tasks for the current user
 */
export async function getBetaTestingTasks(
  accessToken: string
): Promise<BetaTestingTask[]> {
  const raw = await apiRequest<BetaTestingTaskApi[]>(
    "/beta-testing/tasks",
    accessToken
  );
  return raw.map(mapBetaTestingTask);
}

/**
 * Mark a task with a status (not_tested, works, broken)
 * - `completed` is kept for backwards compatibility
 */
export async function markBetaTaskComplete(
  accessToken: string,
  taskId: string,
  completed: boolean,
  status?: BetaTaskStatus,
  notes?: string
): Promise<void> {
  const body = {
    completed,
    ...(status !== undefined ? { status } : {}),
    ...(notes !== undefined ? { notes } : {}),
  } satisfies JsonObject;

  await apiRequest<void>(`/beta-testing/tasks/${taskId}`, accessToken, {
    method: "POST",
    ...jsonBody(body),
  });
}

/**
 * Submit beta testing feedback
 */
export async function submitBetaFeedback(
  accessToken: string,
  feedback: { rating?: number; message: string }
): Promise<void> {
  await apiRequest<void>("/beta-testing/feedback", accessToken, {
    method: "POST",
    ...jsonBody(feedback),
  });
}

/**
 * Get beta testing statistics
 */
export async function getBetaTestingStats(
  accessToken: string
): Promise<BetaTestingStats> {
  const raw = await apiRequest<BetaTestingStatsApi>(
    "/beta-testing/stats",
    accessToken
  );
  return mapBetaTestingStats(raw);
}
