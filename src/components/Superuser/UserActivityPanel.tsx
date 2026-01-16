import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Search,
  Filter,
  Flag,
  Trash2,
  Shield,
  Ban,
  Clock,
  AlertCircle,
  ChevronDown,
  User,
  Crown,
} from "lucide-react";
import { getUserActivity, getAllUsers } from "../../shared/api/admin";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

interface ActivityItem {
  id: string;
  type:
    | "flag_submitted"
    | "flag_received"
    | "content_deleted"
    | "moderation_action"
    | "account_action";
  timestamp: string;
  userName: string;
  userId: string;
  details: any;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  isModerator: boolean;
  isSuperuser: boolean;
  isBanned: boolean;
}

interface UserSearchResult {
  id: string;
  email: string;
  displayName: string;
  isSuperuser: boolean;
  isModerator: boolean;
  isBanned: boolean;
}

interface UserActivityPanelProps {
  accessToken: string;
}

export function UserActivityPanel({ accessToken }: UserActivityPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [filteredActivity, setFilteredActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // New state for user search dropdown
  const [allUsers, setAllUsers] = useState<UserSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load all users on mount
  useEffect(() => {
    loadAllUsers();
  }, []);

  // Filter users as search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      if (!searchQuery) return;
      const query = searchQuery.toLowerCase();
      const filtered = allUsers.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.id?.toLowerCase().includes(query)
      );
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery, allUsers]);

  const loadAllUsers = async () => {
    try {
      const users = await getAllUsers(accessToken);
      setAllUsers(users);
    } catch (error: any) {
      console.error("Failed to load users for search:", error);
      // Don't show error to user, they can still search by typing
    }
  };

  const selectUser = async (user: UserSearchResult) => {
    setSearchQuery(user.displayName);
    setShowDropdown(false);
    await loadUserActivity(user.id);
  };

  const loadUserActivity = async (userId: string) => {
    try {
      setLoading(true);
      console.log("Searching for user:", userId);
      const data = await getUserActivity(accessToken, userId);
      console.log("User activity loaded:", data);
      setSelectedUser(data.user);
      setActivity(data.activity);
      setFilteredActivity(data.activity);
      toast.success(`Loaded activity for ${data.user.name}`);
    } catch (error: any) {
      console.error("Failed to load user activity:", error);
      console.error("Error details:", error.message, error.stack);
      toast.error(error.message || "Failed to load user activity");
      setSelectedUser(null);
      setActivity([]);
      setFilteredActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!activity || activity.length === 0) {
      setFilteredActivity([]);
      return;
    }

    let filtered = [...activity];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredActivity(filtered);
  };

  // Apply filters whenever filter settings change
  useEffect(() => {
    if (activity) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, sortOrder, activity]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case "flag_submitted":
        return "Flag Submitted";
      case "flag_received":
        return "Flag Received";
      case "content_deleted":
        return "Content Deleted";
      case "moderation_action":
        return "Moderation Action";
      case "account_action":
        return "Account Action";
      default:
        return type;
    }
  };

  const getActivityTypeBadge = (type: string) => {
    switch (type) {
      case "flag_submitted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "flag_received":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "content_deleted":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "moderation_action":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "account_action":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "flag_submitted":
      case "flag_received":
        return <Flag className="w-4 h-4" />;
      case "content_deleted":
        return <Trash2 className="w-4 h-4" />;
      case "moderation_action":
        return <Shield className="w-4 h-4" />;
      case "account_action":
        return <Ban className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const stats = {
    flagsSubmitted: activity.filter((a) => a.type === "flag_submitted").length,
    flagsReceived: activity.filter((a) => a.type === "flag_received").length,
    contentDeleted: activity.filter((a) => a.type === "content_deleted").length,
    moderationActions: activity.filter((a) => a.type === "moderation_action")
      .length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-1">
          User Activity History
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View complete audit trail for flags, deletions, and moderation actions
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Enter user ID, email, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && loadUserActivity(searchQuery)
            }
            className="pl-10"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            name="user-search-query"
            data-form-type="other"
            data-lpignore="true"
          />
          {showDropdown && (
            <div className="absolute left-0 top-full w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md z-10 max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => selectUser(user)}
                >
                  <User className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  {user.isSuperuser && (
                    <Crown className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          onClick={() => loadUserActivity(searchQuery)}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Loading...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* User Info & Stats */}
      {selectedUser && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg text-gray-900 dark:text-gray-100">
                  {selectedUser.name}
                </h3>
                {selectedUser.isSuperuser && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Superuser
                  </Badge>
                )}
                {selectedUser.isModerator && !selectedUser.isSuperuser && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Moderator
                  </Badge>
                )}
                {selectedUser.isBanned && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Banned
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedUser.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ID: {selectedUser.id}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Flag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Flags Submitted
                </span>
              </div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {stats.flagsSubmitted}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Flags Received
                </span>
              </div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {stats.flagsReceived}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Content Deleted
                </span>
              </div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {stats.contentDeleted}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Mod Actions
                </span>
              </div>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {stats.moderationActions}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {selectedUser && activity.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Filters:
            </span>
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="flag_submitted">Flags Submitted</SelectItem>
              <SelectItem value="flag_received">Flags Received</SelectItem>
              <SelectItem value="content_deleted">Content Deleted</SelectItem>
              <SelectItem value="moderation_action">Mod Actions</SelectItem>
              <SelectItem value="account_action">Account Actions</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOrder}
            onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            Showing {filteredActivity.length} of {activity.length} items
          </div>
        </div>
      )}

      {/* Activity List */}
      {selectedUser && (
        <ScrollArea className="h-[600px] rounded-xl border border-gray-200 dark:border-gray-700">
          {filteredActivity.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">
                {activity.length === 0
                  ? "No activity found for this user"
                  : "No activity matches the selected filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {filteredActivity.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  formatDate={formatDate}
                  getActivityTypeLabel={getActivityTypeLabel}
                  getActivityTypeBadge={getActivityTypeBadge}
                  getActivityIcon={getActivityIcon}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Empty State */}
      {!selectedUser && !loading && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-gray-700 dark:text-gray-300 mb-2">
            Search for a User
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter a user ID, email, or name to view their complete activity
            history
          </p>
        </div>
      )}
    </div>
  );
}

// Activity Card Component
interface ActivityCardProps {
  item: ActivityItem;
  formatDate: (date: string) => string;
  getActivityTypeLabel: (type: string) => string;
  getActivityTypeBadge: (type: string) => string;
  getActivityIcon: (type: string) => React.ReactNode;
}

function ActivityCard({
  item,
  formatDate,
  getActivityTypeLabel,
  getActivityTypeBadge,
  getActivityIcon,
}: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const renderDetails = () => {
    switch (item.type) {
      case "flag_submitted":
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              Submitted a flag for{" "}
              <Badge variant="outline" className="ml-1">
                {item.details.targetType}
              </Badge>
            </p>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Reason:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.reason}
                </span>
              </div>
              {item.details.notes && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Notes:
                  </span>{" "}
                  <span className="text-gray-700 dark:text-gray-300">
                    {item.details.notes}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Status:
                </span>{" "}
                <Badge variant="outline" className="ml-1 text-xs">
                  {item.details.status}
                </Badge>
              </div>
            </div>
          </div>
        );
      case "flag_received":
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              Their{" "}
              <Badge variant="outline" className="mx-1">
                {item.details.targetType}
              </Badge>{" "}
              was flagged
            </p>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Reported by:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.reporterName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Reason:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.reason}
                </span>
              </div>
              {item.details.notes && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Notes:
                  </span>{" "}
                  <span className="text-gray-700 dark:text-gray-300">
                    {item.details.notes}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Status:
                </span>{" "}
                <Badge variant="outline" className="ml-1 text-xs">
                  {item.details.status}
                </Badge>
              </div>
            </div>
          </div>
        );
      case "content_deleted":
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              Their{" "}
              <Badge variant="outline" className="mx-1">
                {item.details.contentType}
              </Badge>{" "}
              was deleted
            </p>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Deleted by:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.deletedBy}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Reason:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.reason}
                </span>
              </div>
              {expanded && (
                <>
                  {item.details.deckName && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Deck:
                      </span>{" "}
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.details.deckName}
                      </span>
                    </div>
                  )}
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Content:
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {item.details.content}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case "moderation_action":
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              Deleted a{" "}
              <Badge variant="outline" className="mx-1">
                {item.details.contentType}
              </Badge>{" "}
              by {item.details.targetUser}
            </p>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Action:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.action.replace("_", " ")}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Reason:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.reason}
                </span>
              </div>
              {expanded && (
                <>
                  {item.details.deckName && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Deck:
                      </span>{" "}
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.details.deckName}
                      </span>
                    </div>
                  )}
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Content:
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {item.details.content}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case "account_action":
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              Account was{" "}
              <Badge variant="outline" className="mx-1 text-red-600">
                {item.details.action}
              </Badge>
            </p>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400">By:</span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.bannedBy}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Reason:
                </span>{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.details.reason}
                </span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Unknown activity type
          </p>
        );
    }
  };

  const hasExpandableContent =
    item.type === "content_deleted" || item.type === "moderation_action";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${getActivityTypeBadge(item.type)}`}>
            {getActivityIcon(item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getActivityTypeBadge(item.type)}>
                {getActivityTypeLabel(item.type)}
              </Badge>
            </div>
            {renderDetails()}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatDate(item.timestamp)}</span>
            </div>
          </div>
          {hasExpandableContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
