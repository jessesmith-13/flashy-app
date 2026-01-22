import { useEffect, useState } from "react";
import { searchCommunityUsers } from "@/shared/api/community";

export type CommunityUserSearchResult = {
  id: string;
  name: string;
  deckCount: number;
};

type UserSearchResult = {
  id: string;
  name: string;
  deckCount: number;
};

export function useCommunityUsersSearch(query: string) {
  const [searchedUsers, setSearchedUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await searchCommunityUsers(query);
        setSearchedUsers(users);
      } catch {
        // 👈 THIS is the missing piece
        setSearchedUsers([]);
      } finally {
        setLoading(false);
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [query]);

  return { searchedUsers, loading };
}
