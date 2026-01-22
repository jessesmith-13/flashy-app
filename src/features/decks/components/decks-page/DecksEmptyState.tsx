import { Button } from "@/shared/ui/button";
import type { DecksTab } from "@/types/decks";
import { BookOpen, Search } from "lucide-react";

interface DecksEmptyStateProps {
  activeTab: DecksTab;
  searchQuery: string;
  filterCategory: string;
  filterSubtopic: string;
  onClearFilters: () => void;
}

export function DecksEmptyState({
  activeTab,
  searchQuery,
  filterCategory,
  filterSubtopic,
  onClearFilters,
}: DecksEmptyStateProps) {
  const hasFilters =
    !!searchQuery || filterCategory !== "all" || filterSubtopic !== "all";

  if (hasFilters) {
    return (
      <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
        <Search className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">No decks found</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Try adjusting your search query or filters
        </p>

        {(filterCategory !== "all" || filterSubtopic !== "all") && (
          <Button
            onClick={onClearFilters}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  const title =
    activeTab === "all"
      ? "No decks yet"
      : activeTab === "favorites"
        ? "No favorite decks yet"
        : activeTab === "learned"
          ? "No learned decks yet"
          : activeTab === "added"
            ? "No added decks yet"
            : activeTab === "created"
              ? "No created decks yet"
              : activeTab === "published"
                ? "No published decks yet"
                : "No unpublished decks yet";

  const subtitle =
    activeTab === "all"
      ? "Create your first deck to get started!"
      : activeTab === "favorites"
        ? "Star decks to mark them as favorites!"
        : activeTab === "learned"
          ? "Mark decks as learned when you master them!"
          : activeTab === "added"
            ? "Import decks from the Community to see them here!"
            : activeTab === "created"
              ? "Create a new deck to get started!"
              : activeTab === "published"
                ? "Publish a deck to the community to see it here!"
                : "All your decks are published! Create a new deck to see unpublished ones.";

  return (
    <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
      <BookOpen className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <p className="text-gray-600 dark:text-gray-400 mb-2">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-500">{subtitle}</p>
    </div>
  );
}
