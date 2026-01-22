import { useEffect, useState } from "react";
import { searchCommunityUsers } from "@/shared/api/community";

export type CommunityUserSearchResult = {
  id: string;
  name: string;
  deckCount: number;
};

export function useCommunityUsersSearch(searchQuery: string) {
  const [searchedUsers, setSearchedUsers] = useState<
    CommunityUserSearchResult[]
  >([]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length >= 2) {
        try {
          const users = await searchCommunityUsers(searchQuery);
          setSearchedUsers(users);
        } catch (error) {
          console.error("Failed to search users:", error);
          setSearchedUsers([]);
        }
      } else {
        setSearchedUsers([]);
      }
    };

    const timeoutId = window.setTimeout(searchUsers, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  return { searchedUsers, setSearchedUsers };
}
