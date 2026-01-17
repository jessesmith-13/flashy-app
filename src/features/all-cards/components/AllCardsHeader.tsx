import { Button } from "@/shared/ui/button";
import { ArrowLeft } from "lucide-react";

export function AllCardsHeader({
  totalCards,
  onBack,
}: {
  totalCards: number;
  onBack: () => void;
}) {
  return (
    <div className="mb-6">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to My Flashcards
      </Button>

      <h1 className="text-3xl text-gray-900 dark:text-gray-100">All Cards</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        {totalCards} total card{totalCards !== 1 ? "s" : ""} across all decks
      </p>
    </div>
  );
}
