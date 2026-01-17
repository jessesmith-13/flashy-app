// src/shared/api/betaTesting/types.api.ts
import type { BetaTaskStatus } from "@/types/betaTesting";

export type BetaTestingTaskApi = {
  id: string;
  user_id: string;
  task_id: string;
  task_category: string;
  completed: boolean;
  status: BetaTaskStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BetaFeedbackApi = {
  id: string;
  user_id: string;
  rating: number | null;
  message: string;
  created_at: string;
};

export type BetaTestingStatsApi = {
  total_beta_testers: number;
  average_completion: number;
  total_feedback: number;
  top_completed_tasks: Array<{
    task_id: string;
    completion_count: number;
  }>;
  least_completed_tasks: Array<{
    task_id: string;
    completion_count: number;
  }>;
  recent_feedback: BetaFeedbackApi[];
};
