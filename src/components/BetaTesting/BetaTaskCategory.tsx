import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BetaTaskItem } from "./BetaTaskItem";
import type {
  BetaTaskCategory as BetaTaskCategoryType,
  BetaTestingTask,
} from "../../types/betaTesting";

interface BetaTaskCategoryProps {
  category: BetaTaskCategoryType;
  taskStatuses: Map<string, "not_tested" | "works" | "broken">;
  tasks: BetaTestingTask[]; // Add full tasks array
  defaultExpanded?: boolean;
  onTaskStatusChange: (
    taskId: string,
    status: "not_tested" | "works" | "broken",
    notes?: string
  ) => Promise<void>;
  onNavigate?: (path: string) => void;
}

export function BetaTaskCategory({
  category,
  taskStatuses,
  tasks,
  defaultExpanded = false,
  onTaskStatusChange,
  onNavigate,
}: BetaTaskCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const testedCount = category.tasks.filter((task) => {
    const status = taskStatuses.get(task.id) || "not_tested";
    return status === "works" || status === "broken";
  }).length;
  const totalCount = category.tasks.length;
  const completionPercentage = Math.round((testedCount / totalCount) * 100);

  return (
    <div
      className={`
      border rounded-lg overflow-hidden transition-all
      ${
        completionPercentage === 100
          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }
    `}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full p-4 flex items-center justify-between transition-colors
          ${
            completionPercentage === 100
              ? "hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }
        `}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {/* Icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {category.title}
            </h3>
            {category.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {category.description}
              </p>
            )}
          </div>

          {/* Progress Badge */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="text-sm">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {testedCount}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                /{totalCount}
              </span>
            </div>
            <div
              className={`
                px-2 py-1 rounded text-xs font-medium
                ${
                  completionPercentage === 100
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : completionPercentage > 0
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }
              `}
            >
              {completionPercentage}%
            </div>
          </div>
        </div>
      </button>

      {/* Tasks List */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-2 border-t border-gray-200 dark:border-gray-700">
          {category.tasks.map((task) => {
            const taskData = tasks.find((t) => t.taskId === task.id);
            return (
              <BetaTaskItem
                key={task.id}
                task={task}
                status={taskStatuses.get(task.id) || "not_tested"}
                notes={taskData?.notes}
                onStatusChange={onTaskStatusChange}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
