import { useState } from "react";
import { Check, X, ExternalLink } from "lucide-react";
import { Button } from "../../ui/button";
import type { BetaTaskDefinition } from "../../types/betaTesting";

interface BetaTaskItemProps {
  task: BetaTaskDefinition;
  status: "not_tested" | "works" | "broken";
  notes?: string | null;
  onStatusChange: (
    taskId: string,
    status: "not_tested" | "works" | "broken",
    notes?: string
  ) => Promise<void>;
  onNavigate?: (path: string, userId?: string) => void;
}

export function BetaTaskItem({
  task,
  status,
  notes: initialNotes,
  onStatusChange,
  onNavigate,
}: BetaTaskItemProps) {
  const [loading, setLoading] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");

  const handleStatusChange = async (
    newStatus: "not_tested" | "works" | "broken"
  ) => {
    // If clicking broken and it wasn't broken before, show the notes input
    if (newStatus === "broken" && status !== "broken") {
      setShowNotesInput(true);
      // Still update status immediately (optimistic)
      setLoading(true);
      try {
        await onStatusChange(task.id, newStatus, notes || undefined);
      } catch (error) {
        console.error("Error changing task status:", error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // If toggling off broken status, hide the input
    if (status === "broken" && newStatus === "not_tested") {
      setShowNotesInput(false);
      setNotes("");
    }

    setLoading(true);
    try {
      await onStatusChange(
        task.id,
        newStatus,
        newStatus === "broken" ? notes || undefined : undefined
      );
    } catch (error) {
      console.error("Error changing task status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotesBlur = async () => {
    // Auto-save notes on blur
    if (status === "broken") {
      try {
        await onStatusChange(task.id, "broken", notes || undefined);
      } catch (error) {
        console.error("Error saving notes:", error);
      }
    }
  };

  const handleTestNow = () => {
    if (task.navigateToUser && onNavigate) {
      onNavigate("/community", task.navigateToUser);
    } else if (task.navigateTo && onNavigate) {
      onNavigate(task.navigateTo);
    } else {
      console.log("🔍 No navigation set for this task", { task });
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border transition-all
        ${
          status === "works"
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700"
            : status === "broken"
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        }
      `}
    >
      {/* 3-State Buttons */}
      <div className="flex flex-col gap-1 pt-0.5">
        {/* Works Button */}
        <button
          type="button"
          onClick={() =>
            handleStatusChange(status === "works" ? "not_tested" : "works")
          }
          disabled={loading}
          className={`
            w-6 h-6 rounded flex items-center justify-center transition-all
            ${
              status === "works"
                ? "bg-emerald-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-600"
            }
          `}
          title="Mark as working"
        >
          <Check className="w-4 h-4" />
        </button>

        {/* Broken Button */}
        <button
          type="button"
          onClick={() =>
            handleStatusChange(status === "broken" ? "not_tested" : "broken")
          }
          disabled={loading}
          className={`
            w-6 h-6 rounded flex items-center justify-center transition-all
            ${
              status === "broken"
                ? "bg-red-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600"
            }
          `}
          title="Mark as broken"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Task Info */}
      <div className="flex-1 min-w-0">
        <div
          className={`
            block text-sm font-medium
            ${
              status === "works"
                ? "text-emerald-700 dark:text-emerald-400"
                : status === "broken"
                ? "text-red-700 dark:text-red-400"
                : "text-gray-900 dark:text-gray-100"
            }
          `}
        >
          {task.label}
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {task.description}
          </p>
        )}

        {task.autoCheckCondition && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Auto-completes: {task.autoCheckCondition}
          </p>
        )}

        {/* Status Badge */}
        {status !== "not_tested" && (
          <div className="mt-2">
            <span
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                ${
                  status === "works"
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                }
              `}
            >
              {status === "works" ? (
                <>
                  <Check className="w-3 h-3" />
                  Works
                </>
              ) : (
                <>
                  <X className="w-3 h-3" />
                  Doesn't Work
                </>
              )}
            </span>
          </div>
        )}

        {/* Notes Input - Shows when status is broken */}
        {(status === "broken" || showNotesInput) && (
          <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="What went wrong? (optional)"
              className="w-full px-2 py-1.5 text-xs border border-red-300 dark:border-red-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600"
            />
          </div>
        )}

        {/* Display existing notes if not editing */}
        {status === "broken" && !showNotesInput && notes && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic bg-white/50 dark:bg-gray-900/30 px-2 py-1 rounded border border-red-200 dark:border-red-800">
            💬 "{notes}"
          </div>
        )}
      </div>

      {/* Test Now Button */}
      {(task.navigateTo || task.navigateToUser) && status === "not_tested" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleTestNow();
          }}
          className="flex-shrink-0 h-8 px-2 text-xs"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Test Now
        </Button>
      )}
    </div>
  );
}
