// src/shared/api/betaTesting/mappers.ts

import type {
  BetaTestingTask,
  BetaTestingStats,
  BetaFeedback,
  BetaTaskStatus,
} from "@/types/betaTesting";
import type {
  BetaTestingTaskApi,
  BetaTestingStatsApi,
  BetaFeedbackApi,
} from "./types.api";

// accept BOTH snake_case and camelCase
type AnyRecord = Record<string, unknown>;

function pickString(obj: AnyRecord, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return "";
}
function pickOptionalString(
  obj: AnyRecord,
  ...keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
    if (v === null) return undefined;
  }
  return undefined;
}
function pickBool(obj: AnyRecord, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return false;
}
function pickNumber(obj: AnyRecord, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
  }
  return 0;
}
function pickStatus(obj: AnyRecord, ...keys: string[]): BetaTaskStatus {
  for (const k of keys) {
    const v = obj[k];
    if (v === "not_tested" || v === "works" || v === "broken") return v;
  }
  return "not_tested";
}

export function mapBetaFeedback(
  row: BetaFeedbackApi | AnyRecord
): BetaFeedback {
  const r = row as AnyRecord;
  return {
    id: pickString(r, "id"),
    userId: pickString(r, "user_id", "userId"),
    rating:
      typeof r["rating"] === "number" ? (r["rating"] as number) : undefined,
    message: pickString(r, "message"),
    createdAt: pickString(r, "created_at", "createdAt"),
  };
}

export function mapBetaTestingTask(
  row: BetaTestingTaskApi | AnyRecord
): BetaTestingTask {
  const r = row as AnyRecord;

  const taskId = pickString(r, "task_id", "taskId");

  return {
    id: pickString(r, "id"),
    userId: pickString(r, "user_id", "userId"),
    taskId,
    taskCategory: pickString(r, "task_category", "taskCategory"),
    completed: pickBool(r, "completed"),
    status: pickStatus(r, "status"),
    completedAt: pickOptionalString(r, "completed_at", "completedAt"),
    notes: pickOptionalString(r, "notes"),
    createdAt: pickString(r, "created_at", "createdAt"),
    updatedAt: pickString(r, "updated_at", "updatedAt"),
  };
}

export function mapBetaTestingStats(
  raw: BetaTestingStatsApi | AnyRecord
): BetaTestingStats {
  const r = raw as AnyRecord;

  const top = (r["top_completed_tasks"] ??
    r["topCompletedTasks"] ??
    []) as AnyRecord[];
  const least = (r["least_completed_tasks"] ??
    r["leastCompletedTasks"] ??
    []) as AnyRecord[];
  const recent = (r["recent_feedback"] ??
    r["recentFeedback"] ??
    []) as AnyRecord[];

  return {
    totalBetaTesters: pickNumber(r, "total_beta_testers", "totalBetaTesters"),
    averageCompletion: pickNumber(r, "average_completion", "averageCompletion"),
    totalFeedback: pickNumber(r, "total_feedback", "totalFeedback"),
    topCompletedTasks: top.map((t) => ({
      taskId: pickString(t, "task_id", "taskId"),
      completionCount: pickNumber(t, "completion_count", "completionCount"),
    })),
    leastCompletedTasks: least.map((t) => ({
      taskId: pickString(t, "task_id", "taskId"),
      completionCount: pickNumber(t, "completion_count", "completionCount"),
    })),
    recentFeedback: recent.map(mapBetaFeedback),
  };
}
