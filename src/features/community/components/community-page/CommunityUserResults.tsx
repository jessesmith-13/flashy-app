type CommunityUserResult = {
  id: string;
  name: string;
  deckCount: number;
};

type Props = {
  users: CommunityUserResult[];
  onSelectUser: (userId: string) => void;
};

export function CommunityUserResults({ users, onSelectUser }: Props) {
  if (!users.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Users
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {users.length} {users.length === 1 ? "user" : "users"} found
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelectUser(user.id)}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.deckCount} {user.deckCount === 1 ? "deck" : "decks"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
