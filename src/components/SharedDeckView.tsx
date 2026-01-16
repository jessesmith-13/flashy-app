import { useState, useEffect } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../shared/hooks/useNavigation";
import { getSharedDeck } from "../../utils/api/decks";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, BookOpen, Check } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/Layout/AppLayout";
import { UICard } from "@/types/decks";

interface SharedDeckViewProps {
  shareId: string;
  onBack: () => void;
}

export function SharedDeckView({ shareId, onBack }: SharedDeckViewProps) {
  const [deckData, setDeckData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    setTemporaryStudyDeck,
    user,
    accessToken,
    setStudyOptions,
    setReturnToSharedDeckId,
  } = useStore();
  const { navigateTo } = useNavigation();

  useEffect(() => {
    console.log(
      "SharedDeckView mounted/updated - shareId:",
      shareId,
      "user:",
      user ? `logged in as ${user.email}` : "not logged in"
    );
    loadSharedDeck();
  }, [shareId]);

  // Log when user changes
  useEffect(() => {
    console.log(
      "User state changed in SharedDeckView:",
      user ? `logged in as ${user.email}` : "not logged in"
    );
  }, [user]);

  const loadSharedDeck = async () => {
    try {
      setLoading(true);
      console.log("Loading shared deck with shareId:", shareId);
      const deck = await getSharedDeck(shareId);
      console.log("Loaded shared deck:", deck);
      setDeckData(deck);
    } catch (error: any) {
      console.error("Failed to load shared deck:", error);
      setError("Failed to load shared deck");
    } finally {
      setLoading(false);
    }
  };

  const handleStudyDeck = () => {
    if (!deckData) return;

    console.log(
      "handleStudyDeck called - user:",
      user ? `logged in as ${user.email}` : "not logged in"
    );
    console.log(
      "Setting up temporary study deck with cards:",
      deckData.cards.length
    );

    // Set default study options for shared decks
    setStudyOptions({
      timedMode: false,
      continuousShuffle: false,
      order: "randomized",
      excludeIgnored: false,
      favoritesOnly: false,
    });

    // Mark that we should return to this shared deck after studying
    setReturnToSharedDeckId(shareId);

    // 🔧 FIX: Use the actual deck type from the data, not hardcoded 'classic-flip'
    const actualDeckType = deckData.deckType || "classic-flip";

    // Set up temporary study deck in store
    setTemporaryStudyDeck({
      deck: {
        id: shareId,
        name: deckData.name,
        color: deckData.color,
        emoji: deckData.emoji,
        cardCount: deckData.cards.length,
        category: deckData.category,
        subtopic: deckData.subtopic,
        ownerId: deckData.owner_id || "unknown",
        ownerDisplayName: deckData.owner_display_name || "Unknown",
        cards: deckData.cards,
        publishedAt: new Date().toISOString(),
        downloadCount: 0,
        createdAt: new Date().toISOString(),
      },
      cards: deckData.cards,
    });

    console.log(
      "Temporary study deck set with type:",
      actualDeckType,
      "navigating to study screen"
    );

    // Clear the shared deck view
    onBack();

    // Navigate to study screen
    navigateTo("study");
  };

  const handleSaveToDeck = async () => {
    if (!user || !accessToken || !deckData) return;

    setSaving(true);
    try {
      toast.success("Deck saved to your library!");

      // Navigate to decks view after short delay
      setTimeout(() => {
        navigateTo("decks");
      }, 1000);
    } catch (error: any) {
      console.error("Failed to save deck:", error);
      if (error.message?.includes("already added")) {
        toast.error("You already have this deck in your library");
      } else {
        toast.error("Failed to save deck");
      }
    } finally {
      setSaving(false);
    }
  };

  // 🔧 NEW: Helper function to render card preview based on card type
  const renderCardPreview = (card: UICard, index: number) => {
    const cardType = card.cardType || "classic-flip";

    if (cardType === "multiple-choice") {
      // Multiple-choice cards: front + correctAnswers + incorrectAnswers
      const correctAnswers = Array.isArray(card.correctAnswers)
        ? card.correctAnswers
        : [];
      const incorrectAnswers = Array.isArray(card.incorrectAnswers)
        ? card.incorrectAnswers
        : [];
      const allOptions = [...correctAnswers, ...incorrectAnswers].slice(0, 4); // Show max 4 options

      return (
        <div
          key={card.id || index}
          className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {card.front}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Multiple Choice
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Card {index + 1}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {allOptions.map((option, i) => {
              const isCorrect = correctAnswers.includes(option);
              return (
                <div
                  key={i}
                  className={`text-xs px-2 py-1 rounded ${
                    isCorrect
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {isCorrect && "✓ "}
                  {option}
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (cardType === "type-answer") {
      // Type-answer cards: front + back + acceptedAnswers
      const acceptedAnswers = Array.isArray(card.acceptedAnswers)
        ? card.acceptedAnswers
        : [];

      return (
        <div
          key={card.id || index}
          className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {card.front}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {card.back}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                Type Answer
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Card {index + 1}
              </span>
            </div>
          </div>
          {acceptedAnswers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Also accepts:
              </p>
              <div className="flex flex-wrap gap-1">
                {acceptedAnswers.map((answer, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  >
                    {answer}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } else {
      // Classic flip cards: front + back
      return (
        <div
          key={card.id || index}
          className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {card.front}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {card.back}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                Classic Flip
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Card {index + 1}
              </span>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">
            Loading shared deck...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Deck Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This shared deck doesn't exist or has been removed.
            </p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button onClick={onBack} variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: deckData.color }}
                >
                  {deckData.emoji}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {deckData.name}
                  </h1>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {deckData.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        {deckData.category}
                      </span>
                    )}
                    {deckData.subtopic && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {deckData.subtopic}
                      </span>
                    )}
                    {deckData.difficulty && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          deckData.difficulty === "beginner"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : deckData.difficulty === "intermediate"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                            : deckData.difficulty === "advanced"
                            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                            : deckData.difficulty === "expert"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400"
                        }`}
                      >
                        {deckData.difficulty === "beginner"
                          ? "🟢"
                          : deckData.difficulty === "intermediate"
                          ? "🟡"
                          : deckData.difficulty === "advanced"
                          ? "🟠"
                          : deckData.difficulty === "expert"
                          ? "🔴"
                          : "🌈"}{" "}
                        {deckData.difficulty.charAt(0).toUpperCase() +
                          deckData.difficulty.slice(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Shared by {deckData.authorName} • {deckData.cards.length}{" "}
                    cards
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                {user && (
                  <Button
                    onClick={handleStudyDeck}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={deckData.cards.length === 0}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Study This Deck
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Cards Preview - 🔧 FIX: Now handles all card types */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Cards Preview
            </h2>

            {deckData.cards.length === 0 ? (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                This deck has no cards yet
              </p>
            ) : (
              <div className="space-y-3">
                {deckData.cards
                  .slice(0, 10)
                  .map((card: UICard, index: number) =>
                    renderCardPreview(card, index)
                  )}

                {deckData.cards.length > 10 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                    And {deckData.cards.length - 10} more cards...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sign Up CTA for non-logged-in users OR Save button for logged-in users */}
          {!user ? (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-8 text-center text-white shadow-lg">
              <h3 className="text-2xl mb-2">Love this deck?</h3>
              <p className="text-emerald-50 mb-6">
                Sign up for Flashy to save this deck to your library, track your
                progress, and access thousands of community decks!
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    // Save the current shared deck URL to return to it after signup
                    sessionStorage.setItem("returnToSharedDeck", shareId);
                    // Clear the shared deck view so login/signup can show
                    onBack();
                    navigateTo("signup");
                  }}
                  className="bg-white text-emerald-600 hover:bg-emerald-50"
                >
                  Sign Up Free
                </Button>
                <Button
                  onClick={() => {
                    // Save the current shared deck URL to return to it after login
                    sessionStorage.setItem("returnToSharedDeck", shareId);
                    // Clear the shared deck view so login/signup can show
                    onBack();
                    navigateTo("login");
                  }}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                >
                  Log In
                </Button>
              </div>
            </div>
          ) : user.id !== deckData.createdBy ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Want to keep this deck?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Save it to your library to track your progress and study anytime
              </p>
              <Button
                onClick={handleSaveToDeck}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save to My Decks"}
              </Button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                This is your deck
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You already have this deck in your library
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
