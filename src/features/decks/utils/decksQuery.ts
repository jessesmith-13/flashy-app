import type { UIDeck, DecksTab, SortOption } from "@/types/decks";
import type { StudySession } from "@/types/study";

export function getDeckStudyStats(deckId: string, sessions: StudySession[]) {
  const deckSessions = sessions.filter((s) => s.deckId === deckId);
  const studyCount = deckSessions.length;
  const lastStudyDate =
    deckSessions.length > 0
      ? Math.max(...deckSessions.map((s) => new Date(s.date).getTime()))
      : 0;

  return { studyCount, lastStudyDate };
}

export function filterDecks(params: {
  decks: UIDeck[];
  activeTab: DecksTab;
  searchQuery: string;
  filterCategory: string;
  filterSubtopic: string;
}): UIDeck[] {
  const { decks, activeTab, searchQuery, filterCategory, filterSubtopic } =
    params;

  const q = searchQuery.trim().toLowerCase();

  return decks.filter((deck) => {
    if (deck.isDeleted) return false;

    const tabFilter = (() => {
      if (activeTab === "favorites") return !!deck.isFavorite;
      if (activeTab === "learned") return !!deck.isLearned;
      if (activeTab === "added") return !!deck.isCommunity || !!deck.isShared;
      if (activeTab === "created") return !deck.isCommunity && !deck.isShared;
      if (activeTab === "published") return !!deck.isPublished;

      if (activeTab === "unpublished") {
        return (
          !deck.sourceCommunityDeckId && !deck.isShared && !deck.isPublished
        );
      }

      return true;
    })();

    const searchFilter = !q || deck.name.toLowerCase().includes(q);

    const categoryFilter =
      filterCategory === "all" || deck.category === filterCategory;

    const subtopicFilter =
      filterSubtopic === "all" || deck.subtopic === filterSubtopic;

    return tabFilter && searchFilter && categoryFilter && subtopicFilter;
  });
}

export function sortDecks(params: {
  decks: UIDeck[];
  sortOption: SortOption;
  studySessions: StudySession[];
}): UIDeck[] {
  const { decks, sortOption, studySessions } = params;

  return [...decks].sort((a, b) => {
    switch (sortOption) {
      case "custom":
        return (a.position || 0) - (b.position || 0);

      case "alphabetical-asc":
        return a.name.localeCompare(b.name);

      case "alphabetical-desc":
        return b.name.localeCompare(a.name);

      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      case "recently-studied": {
        const aStats = getDeckStudyStats(a.id, studySessions);
        const bStats = getDeckStudyStats(b.id, studySessions);
        return bStats.lastStudyDate - aStats.lastStudyDate;
      }

      case "most-studied": {
        const aStats = getDeckStudyStats(a.id, studySessions);
        const bStats = getDeckStudyStats(b.id, studySessions);
        return bStats.studyCount - aStats.studyCount;
      }

      case "least-studied": {
        const aStats = getDeckStudyStats(a.id, studySessions);
        const bStats = getDeckStudyStats(b.id, studySessions);
        return aStats.studyCount - bStats.studyCount;
      }

      default:
        return (a.position || 0) - (b.position || 0);
    }
  });
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  const end = safePage * perPage;

  return {
    totalPages,
    page: safePage,
    items: items.slice(start, end),
  };
}
