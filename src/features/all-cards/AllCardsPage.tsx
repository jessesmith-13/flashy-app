import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigation } from "@/shared/hooks/useNavigation";
import { AllCardsHeader } from "./components/AllCardsHeader";
import { AllCardsSearch } from "./components/AllCardsSearch";
import { AllCardsList } from "./components/AllCardsList";
import { useAllCards } from "./hooks/useAllCards";

export function AllCardsPage() {
  const { navigateTo } = useNavigation();

  const {
    loading,
    searchQuery,
    setSearchQuery,
    cards,
    filteredCards,
    deckById,
    startStudyAll,
  } = useAllCards();

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="max-w-4xl mx-auto p-4 lg:p-8">
          <AllCardsHeader
            totalCards={cards.length}
            onBack={() => navigateTo("decks")}
          />

          <AllCardsSearch value={searchQuery} onChange={setSearchQuery} />

          <AllCardsList
            loading={loading}
            cards={filteredCards}
            totalCards={cards.length}
            searchQuery={searchQuery}
            deckById={deckById}
            onStudyAll={() => {
              startStudyAll();
              navigateTo("study");
            }}
          />
        </div>
      </div>
    </AppLayout>
  );
}
