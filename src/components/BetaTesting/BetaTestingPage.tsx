import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TestTube,
  MessageSquare,
  TrendingUp,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";
import { BetaTaskCategory } from "./BetaTaskCategory";
import { BetaFeedbackModal } from "./BetaFeedbackModal";
import { BETA_TASK_CATEGORIES, getTotalTaskCount } from "../constants";
import {
  getBetaTestingTasks,
  markBetaTaskComplete,
  submitBetaFeedback,
} from "../../../utils/api/betaTesting";
import type { BetaTestingTask } from "../../types/betaTesting";
import { toast } from "sonner";
import { useStore } from "../../../store/useStore";
import { AppLayout } from "../Layout/AppLayout";

export function BetaTestingPage() {
  const navigate = useNavigate();
  const { accessToken } = useStore();
  const [tasks, setTasks] = useState<BetaTestingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const data = await getBetaTestingTasks(accessToken);
      setTasks(data);
    } catch (error) {
      console.error("Error loading beta testing tasks:", error);
      toast.error("Failed to load beta testing tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusChange = async (
    taskId: string,
    status: "not_tested" | "works" | "broken",
    notes?: string
  ) => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    const isCompleted = status === "works" || status === "broken";

    // ✅ OPTIMISTIC UPDATE: Update UI immediately
    setTasks((prevTasks) => {
      const existingTask = prevTasks.find((t) => t.taskId === taskId);

      if (existingTask) {
        // Update existing task
        return prevTasks.map((t) =>
          t.taskId === taskId
            ? {
                ...t,
                status,
                completed: isCompleted,
                completedAt: isCompleted ? new Date().toISOString() : undefined,
                notes: notes || t.notes, // Preserve existing notes or update
              }
            : t
        );
      } else {
        // Add new task
        return [
          ...prevTasks,
          {
            id: crypto.randomUUID(),
            userId: "", // Will be set by backend
            taskId,
            taskCategory:
              BETA_TASK_CATEGORIES.find((cat) =>
                cat.tasks.some((t) => t.id === taskId)
              )?.id || "other",
            status,
            completed: isCompleted,
            completedAt: isCompleted ? new Date().toISOString() : undefined,
            notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
    });

    // 🎉 Show immediate feedback
    if (status === "works") {
      toast.success("✅ Marked as working!");
    } else if (status === "broken") {
      toast.error("🚫 Marked as broken - thanks for reporting!");
    } else {
      toast.info("Reset to not tested");
    }

    // ⏳ Sync with backend in the background
    try {
      await markBetaTaskComplete(
        accessToken,
        taskId,
        isCompleted,
        status,
        notes
      );
    } catch (error) {
      console.error("Error updating task status:", error);

      // ❌ Revert optimistic update on error
      setTasks((prevTasks) => {
        const existingTask = prevTasks.find((t) => t.taskId === taskId);

        if (existingTask) {
          return prevTasks.map((t) =>
            t.taskId === taskId
              ? {
                  ...t,
                  status: "not_tested", // Revert
                  completed: false,
                  completedAt: undefined,
                  notes: undefined,
                }
              : t
          );
        } else {
          return prevTasks.filter((t) => t.taskId !== taskId); // Remove newly added task
        }
      });

      toast.error("Failed to update task - reverted");
    }
  };

  const handleNavigate = (path: string, userId?: string) => {
    if (userId) {
      // Navigate to user profile
      const { setViewingUserId, setUserProfileReturnView } =
        useStore.getState();
      setViewingUserId(userId);
      setUserProfileReturnView("community"); // Return to community view
      navigate("/community");
    } else {
      navigate(path);
    }
  };

  const handleFeedbackSubmit = async (feedback: {
    rating?: number;
    message: string;
  }) => {
    if (!accessToken) {
      toast.error("Not authenticated");
      throw new Error("Not authenticated");
    }

    try {
      await submitBetaFeedback(accessToken, feedback);
      toast.success("Thank you for your feedback! 🙏");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
      throw error;
    }
  };

  // Calculate progress - count tasks with status 'works' or 'broken'
  const taskStatuses = new Map<string, "not_tested" | "works" | "broken">();
  tasks.forEach((task) => {
    taskStatuses.set(task.taskId, task.status || "not_tested");
  });

  const totalTasks = getTotalTaskCount();
  const testedCount = tasks.filter(
    (t) => t.status === "works" || t.status === "broken"
  ).length;
  const completionPercentage = Math.round((testedCount / totalTasks) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading beta testing tasks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TestTube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Beta Testing
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Help us make Flashy better!
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">
                  Welcome, Beta Tester! 👋
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                  Test features and mark them as ✅ <strong>Working</strong> or
                  🚫 <strong>Broken</strong>. You don't need to test everything
                  - focus on what interests you!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Your Progress
              </h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {completionPercentage}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {testedCount} of {totalTasks} tested
              </p>
            </div>
          </div>
          <Progress value={completionPercentage} className="h-3" />

          {completionPercentage === 100 && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
              <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                🎉 Wow! You've tested all features! You're an amazing tester!
              </p>
            </div>
          )}
        </div>

        {/* Task Categories */}
        <div className="space-y-4 mb-6">
          {BETA_TASK_CATEGORIES.map((category, index) => (
            <BetaTaskCategory
              key={category.id}
              category={category}
              taskStatuses={taskStatuses}
              tasks={tasks}
              defaultExpanded={index === 0} // Expand first category by default
              onTaskStatusChange={handleTaskStatusChange}
              onNavigate={handleNavigate}
            />
          ))}
        </div>

        {/* Feedback Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Have Feedback?
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Found a bug? Have a suggestion? Love a feature? We want to hear
                from you!
              </p>
              <Button
                onClick={() => setFeedbackModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Share Feedback
              </Button>
            </div>
          </div>
        </div>

        {/* Thank You Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Thank you for helping make Flashy better! 🙏✨
          </p>
        </div>
      </div>

      {/* Feedback Modal */}
      <BetaFeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        onSubmit={handleFeedbackSubmit}
      />
    </AppLayout>
  );
}
