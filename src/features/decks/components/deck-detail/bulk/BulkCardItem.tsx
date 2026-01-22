import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { Trash2 } from "lucide-react";

export function BulkCardItem(props: {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { index, canRemove, onRemove, children } = props;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm text-gray-900 dark:text-gray-100">
          Card {index + 1}
        </h4>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {children}
    </div>
  );
}
