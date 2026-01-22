// src/features/decks/hooks/useDecksFilters.ts
import { useEffect, useMemo } from "react";
import type { UIDeck } from "@/types/decks";
import type { DecksTab, SortOption } from "@/types/decks";
import type { StudySession } from "@/types/study";
import { filterDecks, paginate, sortDecks } from "../utils/decksQuery";
import { getDeckTabCounts } from "../utils/decksTabs";

export function useDecksFilters(params: {
  decks: UIDeck[];
  activeTab: DecksTab;
  sortOption: SortOption;
  searchQuery: string;
  filterCategory: string;
  filterSubtopic: string;
  studySessions: StudySession[];
  currentPage: number;
  setCurrentPage: (n: number) => void;
  perPage: number;
}) {
  const {
    decks,
    activeTab,
    sortOption,
    searchQuery,
    filterCategory,
    filterSubtopic,
    studySessions,
    currentPage,
    setCurrentPage,
    perPage,
  } = params;

  const counts = useMemo(() => getDeckTabCounts(decks), [decks]);

  const filtered = useMemo(
    () =>
      filterDecks({
        decks,
        activeTab,
        searchQuery,
        filterCategory,
        filterSubtopic,
      }),
    [decks, activeTab, searchQuery, filterCategory, filterSubtopic],
  );

  const sorted = useMemo(
    () => sortDecks({ decks: filtered, sortOption, studySessions }),
    [filtered, sortOption, studySessions],
  );

  const paging = useMemo(
    () => paginate(sorted, currentPage, perPage),
    [sorted, currentPage, perPage],
  );

  useEffect(() => {
    if (paging.page !== currentPage) setCurrentPage(paging.page);
  }, [paging.page, currentPage, setCurrentPage]);

  return {
    counts,
    filteredDecks: filtered,
    sortedDecks: sorted,
    paginatedDecks: paging.items,
    totalPages: paging.totalPages,
  };
}
