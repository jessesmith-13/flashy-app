import { useEffect, useMemo, useState } from "react";
import { DifficultyLevel } from "@/types/decks";

type DeckLike = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category?: string | null;
  subtopic?: string | null;
  difficulty?: string | null;
  frontLanguage?: string | null;
  backLanguage?: string | null;
  sourceCommunityDeckId?: string | null;
};

type Draft = {
  name: string;
  emoji: string;
  color: string;
  category: string;
  subtopic: string;
  difficulty: string;
  frontLanguage: string;
  backLanguage: string;
};

export function useDeckSettingsDraft(
  deck: DeckLike | undefined,
  loadCommunityDeckAuthor: (communityDeckId: string) => void,
) {
  const [draft, setDraft] = useState<Draft>({
    name: "",
    emoji: "",
    color: "",
    category: "",
    subtopic: "",
    difficulty: "",
    frontLanguage: "",
    backLanguage: "",
  });

  useEffect(() => {
    if (!deck) return;

    setDraft({
      name: deck.name,
      emoji: deck.emoji,
      color: deck.color,
      category: deck.category || "",
      subtopic: deck.subtopic || "",
      difficulty: deck.difficulty || "",
      frontLanguage: deck.frontLanguage || "",
      backLanguage: deck.backLanguage || "",
    });

    if (deck.sourceCommunityDeckId) {
      loadCommunityDeckAuthor(deck.sourceCommunityDeckId);
    }
  }, [deck, loadCommunityDeckAuthor]);

  const setters = useMemo(
    () => ({
      setName: (v: string) => setDraft((d) => ({ ...d, name: v })),
      setEmoji: (v: string) => setDraft((d) => ({ ...d, emoji: v })),
      setColor: (v: string) => setDraft((d) => ({ ...d, color: v })),
      setCategory: (v: string) => setDraft((d) => ({ ...d, category: v })),
      setSubtopic: (v: string) => setDraft((d) => ({ ...d, subtopic: v })),
      setDifficulty: (v: string) => setDraft((d) => ({ ...d, difficulty: v })),
      setFrontLanguage: (v: string) =>
        setDraft((d) => ({ ...d, frontLanguage: v })),
      setBackLanguage: (v: string) =>
        setDraft((d) => ({ ...d, backLanguage: v })),
    }),
    [],
  );

  /**
   * For API updates: convert "" -> undefined so you don't store empty strings.
   */
  const toUpdates = useMemo(() => {
    return {
      name: draft.name,
      emoji: draft.emoji,
      color: draft.color,
      category: draft.category || undefined,
      subtopic: draft.subtopic || undefined,
      difficulty: (draft.difficulty || undefined) as
        | DifficultyLevel
        | undefined,
      frontLanguage: draft.frontLanguage || undefined,
      backLanguage: draft.backLanguage || undefined,
    };
  }, [draft]);

  return { draft, ...setters, toUpdates };
}
