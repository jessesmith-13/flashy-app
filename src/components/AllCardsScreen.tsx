import { useState, useEffect } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../shared/hooks/useNavigation";
import { fetchDecks, fetchCards } from "../../utils/api/decks";
import { AppLayout } from "./Layout/AppLayout";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { toast } from "sonner";
import { Deck } from "@/types/decks";

export function AllCardsScreen() {
  const { accessToken, cards, decks, setCards, setStudyAllCards } = useStore();
  const { navigateTo } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadAllCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllCards = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch all decks first
      const allDecks = await fetchDecks(accessToken);

      // Then fetch cards for each deck
      const allCardsPromises = allDecks.map((deck: Deck) =>
        fetchCards(accessToken, deck.id)
      );
      const cardsArrays = await Promise.all(allCardsPromises);

      // Flatten the arrays
      const allCards = cardsArrays.flat();
      setCards(allCards);
    } catch (error) {
      console.error("Failed to load cards:", error);
      toast.error("Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      (card.front?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false) ||
      (card.back?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const getDeckName = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    return deck ? deck.name : "Unknown Deck";
  };

  const getDeckEmoji = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    return deck ? deck.emoji : "📚";
  };

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="max-w-4xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigateTo("decks")}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Flashcards
            </Button>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">
              All Cards
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {cards.length} total card{cards.length !== 1 ? "s" : ""} across
              all decks
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Study All Button */}
          {cards.length > 0 && (
            <div className="mb-6">
              <Button
                onClick={() => {
                  setStudyAllCards(true);
                  navigateTo("study");
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Study All Cards ({cards.length})
              </Button>
            </div>
          )}

          {/* Cards List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">
                Loading cards...
              </p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "No cards match your search" : "No cards yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCards.map((card) => {
                return (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                  >
                    {/* Deck and Card Type Header */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-lg">
                        {getDeckEmoji(card.deckId)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {getDeckName(card.deckId)}
                      </span>

                      {/* Card Type Badge */}
                      {card.cardType === "classic-flip" && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          Classic Flip
                        </span>
                      )}
                      {card.cardType === "multiple-choice" && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          Multiple Choice
                        </span>
                      )}
                      {card.cardType === "type-answer" && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          Type Answer
                        </span>
                      )}
                    </div>

                    {/* Card Front */}
                    <p className="text-gray-900 dark:text-gray-100 mb-2 font-medium">
                      {card.front}
                    </p>

                    {/* Card Back (for non-multiple-choice) */}
                    {card.cardType !== "multiple-choice" && (
                      <p className="text-emerald-600 dark:text-emerald-400 mb-2">
                        {card.back}
                      </p>
                    )}

                    {/* MULTIPLE CHOICE - Show accepted and incorrect answers */}
                    {card.cardType === "multiple-choice" && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                        {card.correctAnswers?.length ? (
                          <div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                              Correct answer
                              {card.correctAnswers.length > 1 ? "s" : ""}:
                            </p>
                            <ul className="list-disc list-inside text-sm text-emerald-700 dark:text-emerald-300">
                              {card.correctAnswers.map((answer, i) => (
                                <li key={i}>{answer}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {card.incorrectAnswers?.length ? (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Incorrect answers:
                            </p>
                            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                              {card.incorrectAnswers.map((answer, i) => (
                                <li key={i}>{answer}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* TYPE ANSWER - Show accepted answers */}
                    {card.cardType === "type-answer" &&
                      card.acceptedAnswers?.length && (
                        <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Accepted answers:
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {card.acceptedAnswers.join(", ")}
                          </p>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
