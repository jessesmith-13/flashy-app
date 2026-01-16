import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import {
  Search,
  Filter,
  X,
  Star,
  Users,
  TrendingUp,
  StarIcon,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";
import { DECK_CATEGORIES } from "@/../utils/categories";

interface CommunityFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterCategory: string;
  onCategoryChange: (category: string) => void;
  filterSubtopic: string;
  onSubtopicChange: (subtopic: string) => void;
  sortBy: "popular" | "rating" | "newest";
  onSortChange: (sort: "popular" | "rating" | "newest") => void;
  showFeaturedOnly: boolean;
  onToggleFeatured: () => void;
  showFlashyDecksOnly: boolean;
  onToggleFlashy: () => void;
  showMyPublishedOnly: boolean;
  onToggleMyPublished: () => void;
  showUpdatesOnly: boolean;
  onToggleUpdates: () => void;
}

export function CommunityFilters({
  searchQuery,
  onSearchChange,
  filterCategory,
  onCategoryChange,
  filterSubtopic,
  onSubtopicChange,
  sortBy,
  onSortChange,
  showFeaturedOnly,
  onToggleFeatured,
  showFlashyDecksOnly,
  onToggleFlashy,
  showMyPublishedOnly,
  onToggleMyPublished,
  showUpdatesOnly,
  onToggleUpdates,
}: CommunityFiltersProps) {
  const availableSubtopics =
    filterCategory === "all"
      ? []
      : DECK_CATEGORIES.find((c) => c.category === filterCategory)?.subtopics ||
        [];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search Community..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 bg-white dark:bg-gray-800"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select
            value={filterCategory}
            onValueChange={(value) => {
              onCategoryChange(value);
              onSubtopicChange("all");
            }}
          >
            <SelectTrigger className="bg-white dark:bg-gray-800">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {DECK_CATEGORIES.slice()
                .sort((a, b) => a.category.localeCompare(b.category))
                .map((cat) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {filterCategory !== "all" && availableSubtopics.length > 0 && (
          <div className="flex-1">
            <Select value={filterSubtopic} onValueChange={onSubtopicChange}>
              <SelectTrigger className="bg-white dark:bg-gray-800">
                <SelectValue placeholder="All Subtopics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subtopics</SelectItem>
                {availableSubtopics
                  .slice()
                  .sort((a, b) => a.localeCompare(b))
                  .map((subtopic) => (
                    <SelectItem key={subtopic} value={subtopic}>
                      {subtopic}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-full sm:w-auto">
          <Button
            variant={showFeaturedOnly ? "default" : "outline"}
            onClick={onToggleFeatured}
            className={`w-full ${
              showFeaturedOnly
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            }`}
          >
            <Star
              className={`w-4 h-4 mr-2 ${
                showFeaturedOnly ? "fill-current" : ""
              }`}
            />
            {showFeaturedOnly ? "Featured Only" : "Show Featured"}
          </Button>
        </div>

        <div className="w-full sm:w-auto">
          <Button
            variant={showFlashyDecksOnly ? "default" : "outline"}
            onClick={onToggleFlashy}
            className={`w-full ${
              showFlashyDecksOnly
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            }`}
          >
            <Users className={`w-4 h-4 mr-2`} />
            {showFlashyDecksOnly ? "Flashy Only" : "Flashy Decks"}
          </Button>
        </div>

        <div className="w-full sm:w-auto">
          <Button
            variant={showMyPublishedOnly ? "default" : "outline"}
            onClick={onToggleMyPublished}
            className={`w-full ${
              showMyPublishedOnly
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            }`}
          >
            <User className={`w-4 h-4 mr-2`} />
            {showMyPublishedOnly ? "My Published" : "My Published"}
          </Button>
        </div>

        <div className="w-full sm:w-auto">
          <Button
            variant={showUpdatesOnly ? "default" : "outline"}
            onClick={onToggleUpdates}
            className={`w-full ${
              showUpdatesOnly
                ? "bg-orange-600 hover:bg-orange-700 text-white"
                : "border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2`} />
            {showUpdatesOnly ? "Updates Only" : "Show Updates"}
          </Button>
        </div>

        <div className="w-full sm:w-64">
          <Tabs
            value={sortBy}
            onValueChange={(value) => onSortChange(value as any)}
          >
            <TabsList className="grid w-full grid-cols-3 gap-1 bg-white dark:bg-gray-800 p-1">
              <TabsTrigger
                value="popular"
                className="text-xs data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 gap-1 px-2"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Popular</span>
              </TabsTrigger>
              <TabsTrigger
                value="rating"
                className="text-xs data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 gap-1 px-2"
              >
                <StarIcon className="w-3 h-3" />
                <span>Rating</span>
              </TabsTrigger>
              <TabsTrigger
                value="newest"
                className="text-xs data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 gap-1 px-2"
              >
                <Clock className="w-3 h-3" />
                <span>Newest</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
