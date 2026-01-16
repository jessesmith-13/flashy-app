import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/ui/button";
import { ArrowLeft, X, Check } from "lucide-react";
import { GeneratedCard, GeneratedCardItem } from "./GeneratedCardItem";

interface ReviewCardsScreenProps {
  cards: GeneratedCard[];
  deckName: string | undefined;
  saving: boolean;
  onBack: () => void;
  onSaveAll: () => void;
  onDiscard: () => void;
  onUpdateCard: (index: number, updatedCard: GeneratedCard) => void;
  onRemoveCard: (index: number) => void;
}

export function ReviewCardsScreen({
  cards,
  deckName,
  saving,
  onBack,
  onSaveAll,
  onDiscard,
  onUpdateCard,
  onRemoveCard,
}: ReviewCardsScreenProps) {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Generator
          </Button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl text-gray-900 dark:text-gray-100">
                  Review Generated Cards
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {cards.length} cards ready to save
                </p>
              </div>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Button
                  variant="outline"
                  onClick={onDiscard}
                  disabled={saving}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 flex-1 sm:flex-none whitespace-nowrap"
                >
                  <X className="w-4 h-4 mr-2" />
                  Discard All
                </Button>
                <Button
                  onClick={onSaveAll}
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none whitespace-nowrap"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save to {deckName || "Deck"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {cards.map((card, index) => (
                <GeneratedCardItem
                  key={index}
                  card={card}
                  index={index}
                  onEdit={(updatedCard) => onUpdateCard(index, updatedCard)}
                  onRemove={() => onRemoveCard(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
