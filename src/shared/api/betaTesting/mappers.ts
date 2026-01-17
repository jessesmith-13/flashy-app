// src/shared/api/betaTesting/mappers.ts
import type {
  BetaTestingTask,
  BetaTestingStats,
  BetaFeedback,
} from "@/types/betaTesting";
import type {
  BetaTestingTaskApi,
  BetaTestingStatsApi,
  BetaFeedbackApi,
} from "./types.api";

export function mapBetaFeedback(row: BetaFeedbackApi): BetaFeedback {
  return {
    id: row.id,
    userId: row.user_id,
    rating: row.rating ?? undefined,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function mapBetaTestingTask(row: BetaTestingTaskApi): BetaTestingTask {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    taskCategory: row.task_category,
    completed: row.completed,
    status: row.status,
    completedAt: row.completed_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBetaTestingStats(
  raw: BetaTestingStatsApi
): BetaTestingStats {
  return {
    totalBetaTesters: raw.total_beta_testers,
    averageCompletion: raw.average_completion,
    totalFeedback: raw.total_feedback,
    topCompletedTasks: raw.top_completed_tasks.map((t) => ({
      taskId: t.task_id,
      completionCount: t.completion_count,
    })),
    leastCompletedTasks: raw.least_completed_tasks.map((t) => ({
      taskId: t.task_id,
      completionCount: t.completion_count,
    })),
    recentFeedback: raw.recent_feedback.map(mapBetaFeedback),
  };
}
