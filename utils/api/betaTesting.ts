import { API_BASE } from "@/supabase/runtime";
import type { BetaTestingTask, BetaTestingStats } from "@/types/betaTesting";

/**
 * Get all beta testing tasks for the current user
 */
export async function getBetaTestingTasks(
  accessToken: string
): Promise<BetaTestingTask[]> {
  const response = await fetch(`${API_BASE}/beta-testing/tasks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch beta testing tasks: ${error}`);
  }

  return response.json();
}

/**
 * Mark a task with a status (not_tested, works, or broken)
 */
export async function markBetaTaskComplete(
  accessToken: string,
  taskId: string,
  completed: boolean,
  status?: "not_tested" | "works" | "broken",
  notes?: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/beta-testing/tasks/${taskId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ completed, status, notes }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update task: ${error}`);
  }
}

/**
 * Submit beta testing feedback (NO category field anymore)
 */
export async function submitBetaFeedback(
  accessToken: string,
  feedback: {
    rating?: number;
    message: string;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/beta-testing/feedback`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit feedback: ${error}`);
  }
}

/**
 * Get beta testing statistics
 */
export async function getBetaTestingStats(
  accessToken: string
): Promise<BetaTestingStats> {
  const response = await fetch(`${API_BASE}/beta-testing/stats`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch beta testing stats: ${error}`);
  }

  return response.json();
}
