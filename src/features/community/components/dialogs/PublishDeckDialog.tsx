import { Button } from "@/shared/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";

import type { UIDeck } from "@/types/decks";

type Props = {
  publishableDecks: UIDeck[];
  allDecks: UIDeck[];

  selectedDeckId: string;
  setSelectedDeckId: (id: string) => void;

  publishing: boolean;
  onPublish: () => void;
};

export function PublishDeckDialog({
  publishableDecks,
  allDecks,
  selectedDeckId,
  setSelectedDeckId,
  publishing,
  onPublish,
}: Props) {
  const selectedDeck = allDecks.find((d) => d.id === selectedDeckId) || null;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Publish Deck to Community</DialogTitle>
        <DialogDescription>
          Share your deck with the community
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="deck">Select Deck</Label>
          <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a deck..." />
            </SelectTrigger>

            <SelectContent>
              {publishableDecks.map((deck) => (
                <SelectItem
                  key={deck.id}
                  value={deck.id}
                  disabled={
                    deck.cardCount < 10 || !deck.category || !deck.subtopic
                  }
                >
                  {deck.emoji} {deck.name} ({deck.cardCount} cards)
                  {deck.communityPublishedId ? " • Published" : ""}
                  {deck.cardCount < 10 ? " • Needs 10+ cards" : ""}
                  {!deck.category || !deck.subtopic ? " • Needs category" : ""}
                </SelectItem>
              ))}

              {publishableDecks.length === 0 && (
                <div className="px-2 py-1 text-sm text-gray-500">
                  No decks available to publish. Create a deck with 10+ cards
                  and set its category.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedDeckId && selectedDeck && (
          <>
            {selectedDeck.category && selectedDeck.subtopic ? (
              <>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: selectedDeck.color }}
                    >
                      {selectedDeck.emoji}
                    </div>
                    <div>
                      <h3 className="font-medium dark:text-gray-100">
                        {selectedDeck.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedDeck.cardCount}{" "}
                        {selectedDeck.cardCount === 1 ? "card" : "cards"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      {selectedDeck.category}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {selectedDeck.subtopic}
                    </span>
                  </div>
                </div>

                {selectedDeck.communityPublishedId && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This deck is already published. Publishing again will update
                    it with your latest changes.
                  </p>
                )}
              </>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This deck needs a category and subtopic. Please edit the deck
                  to set these before publishing.
                </p>
              </div>
            )}
          </>
        )}

        <Button
          onClick={onPublish}
          disabled={publishing || !selectedDeckId}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {publishing
            ? "Publishing..."
            : selectedDeck?.communityPublishedId
              ? "Update Published Deck"
              : "Publish to Community"}
        </Button>
      </div>
    </DialogContent>
  );
}
