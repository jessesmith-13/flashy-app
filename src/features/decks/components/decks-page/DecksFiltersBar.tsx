import type { DecksTab, SortOption } from "@/types/decks";
import { DECK_CATEGORIES } from "@/shared/catelog/categories";

import { Input } from "@/shared/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

import {
  ArrowUpDown,
  CheckCircle,
  Download,
  Filter,
  Search,
  Star,
  Upload,
  User,
  X,
} from "lucide-react";

type DeckTabCounts = {
  all: number;
  favorites: number;
  learned: number;
  added: number;
  created: number;
  published: number;
  unpublished: number;
};

interface DecksFiltersBarProps {
  // search
  searchQuery: string;
  setSearchQuery: (v: string) => void;

  // category/subtopic
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterSubtopic: string;
  setFilterSubtopic: (v: string) => void;

  // tabs/sort
  activeTab: DecksTab;
  setActiveTab: (v: DecksTab) => void;
  sortOption: SortOption;
  setSortOption: (v: SortOption) => void;

  // counts for tabs
  counts: DeckTabCounts;

  // optional: allow overriding available categories (defaults to DECK_CATEGORIES)
  categories?: typeof DECK_CATEGORIES;
}

export function DecksFiltersBar({
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  filterSubtopic,
  setFilterSubtopic,
  activeTab,
  setActiveTab,
  sortOption,
  setSortOption,
  counts,
  categories = DECK_CATEGORIES,
}: DecksFiltersBarProps) {
  const selectedCategory = categories.find(
    (c) => c.category === filterCategory,
  );

  return (
    <>
      {/* Search + Category/Subtopic filters */}
      <div className="mb-4 space-y-3 sm:space-y-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 pr-9 sm:pr-10 bg-white dark:bg-gray-800 w-full text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <Select
              value={filterCategory}
              onValueChange={(value) => {
                setFilterCategory(value);
                setFilterSubtopic("all");
              }}
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 text-sm sm:text-base w-full">
                <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filterCategory !== "all" && (
            <div className="flex-1 min-w-0">
              <Select value={filterSubtopic} onValueChange={setFilterSubtopic}>
                <SelectTrigger className="bg-white dark:bg-gray-800 text-sm sm:text-base w-full">
                  <SelectValue placeholder="All Subtopics" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Subtopics</SelectItem>
                  {(selectedCategory?.subtopics ?? []).map((subtopic) => (
                    <SelectItem key={subtopic} value={subtopic}>
                      {subtopic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Tabs + Sort */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
        {/* Mobile tab select */}
        <div className="sm:hidden">
          <Select
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DecksTab)}
          >
            <SelectTrigger className="bg-white dark:bg-gray-800 text-sm w-full">
              <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All ({counts.all})</SelectItem>
              <SelectItem value="favorites">
                Favorites ({counts.favorites})
              </SelectItem>
              <SelectItem value="learned">
                Learned ({counts.learned})
              </SelectItem>
              <SelectItem value="added">Added ({counts.added})</SelectItem>
              <SelectItem value="created">
                Your Decks ({counts.created})
              </SelectItem>
              <SelectItem value="published">
                Published ({counts.published})
              </SelectItem>
              <SelectItem value="unpublished">
                Unpublished ({counts.unpublished})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop tabs */}
        <div className="hidden sm:block">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DecksTab)}
          >
            <TabsList className="bg-white dark:bg-gray-800 shadow-sm inline-flex">
              <TabsTrigger value="all" className="text-sm whitespace-nowrap">
                All
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {counts.all}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="favorites"
                className="text-sm whitespace-nowrap"
              >
                <Star className="w-4 h-4 mr-1" />
                Favorites
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {counts.favorites}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="learned"
                className="text-sm whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Learned
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {counts.learned}
                </span>
              </TabsTrigger>

              <TabsTrigger value="added" className="text-sm whitespace-nowrap">
                <Download className="w-4 h-4 mr-1" />
                Added
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {counts.added}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="created"
                className="text-sm whitespace-nowrap"
              >
                <User className="w-4 h-4 mr-1" />
                Your Decks
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {counts.created}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="published"
                className="text-sm whitespace-nowrap"
              >
                <Upload className="w-4 h-4 mr-1" />
                Published
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {counts.published}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="unpublished"
                className="text-sm whitespace-nowrap"
              >
                <Upload className="w-4 h-4 mr-1" />
                Unpublished
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {counts.unpublished}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <Select
            value={sortOption}
            onValueChange={(value) => setSortOption(value as SortOption)}
          >
            <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-gray-800 text-sm sm:text-base">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="custom">Custom Order</SelectItem>
              <SelectItem value="alphabetical-asc">A → Z</SelectItem>
              <SelectItem value="alphabetical-desc">Z → A</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="recently-studied">Recently Studied</SelectItem>
              <SelectItem value="most-studied">Most Studied</SelectItem>
              <SelectItem value="least-studied">Least Studied</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
