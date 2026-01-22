// src/features/decks/hooks/useDecksBootstrap.ts
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/shared/state/useStore";
import { fetchDecks } from "@/shared/api/decks";
import { fetchStudySessions } from "@/shared/api/study";

export function useDecksBootstrap() {
  const {
    user,
    accessToken,
    setDecks,
    studySessions,
    setStudySessions,
    userAchievements,
    fetchUserAchievements,
    shouldReloadDecks,
    decksCacheInvalidated,
  } = useStore();

  const [loading, setLoading] = useState(true);

  const loadStudySessions = useCallback(async () => {
    if (!accessToken) return;
    try {
      const sessions = await fetchStudySessions(accessToken);
      setStudySessions(sessions);
    } catch (err) {
      console.error("Failed to load study sessions:", err);
    }
  }, [accessToken, setStudySessions]);

  const forceReloadDecks = useCallback(async () => {
    if (!accessToken || !user) return;
    try {
      const fetched = await fetchDecks(accessToken);
      setDecks(fetched);
    } catch (err) {
      console.error("Failed to force reload decks:", err);
      toast.error("Failed to reload decks");
    }
  }, [accessToken, user, setDecks]);

  const loadDecks = useCallback(async () => {
    if (!accessToken || !user) {
      setLoading(false);
      return;
    }

    if (!shouldReloadDecks()) {
      setLoading(false);
      return;
    }

    try {
      const fetched = await fetchDecks(accessToken);
      setDecks(fetched);
    } catch (err) {
      console.error("Failed to load decks:", err);
      toast.error("Failed to load decks");
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, shouldReloadDecks, setDecks]);

  // mount
  useEffect(() => {
    loadDecks();
    loadStudySessions();
    if (accessToken && !userAchievements) {
      fetchUserAchievements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // invalidation (bypass cache)
  useEffect(() => {
    if (decksCacheInvalidated) {
      forceReloadDecks();
    }
  }, [decksCacheInvalidated, forceReloadDecks]);

  return {
    loading,
    loadDecks,
    forceReloadDecks,
    loadStudySessions,
    studySessions,
  };
}
