export type BetaTaskStatus = "not_tested" | "works" | "broken";

export interface BetaTestingTask {
  id: string;
  userId: string;
  taskId: string;
  taskCategory: string;
  completed: boolean; // Keep for backwards compatibility
  status: BetaTaskStatus;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BetaTaskDefinition {
  id: string;
  label: string;
  description?: string;
  autoCheckCondition?: string; // Description of what auto-completes this
  navigateTo?: string; // Path to navigate when "Test Now" is clicked
  navigateToUser?: string; // User ID to view profile when "Test Now" is clicked
}

export interface BetaTaskCategory {
  id: string;
  title: string;
  description?: string;
  icon: string;
  tasks: BetaTaskDefinition[];
}

export interface BetaTestingProgress {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  tasksByCategory: {
    [categoryId: string]: {
      total: number;
      completed: number;
    };
  };
}

export interface BetaFeedback {
  id: string;
  userId: string;
  rating?: number; // Remove category field
  message: string;
  createdAt: string;
}

export interface BetaTestingStats {
  totalBetaTesters: number;
  averageCompletion: number;
  totalFeedback: number;
  topCompletedTasks: Array<{
    taskId: string;
    completionCount: number;
  }>;
  leastCompletedTasks: Array<{
    taskId: string;
    completionCount: number;
  }>;
  recentFeedback: BetaFeedback[];
}
