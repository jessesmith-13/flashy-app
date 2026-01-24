import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

interface UpdateDeckWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityDeck: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    cardsCount: number;
  } | null;
  importedDeck: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    cardCount: number;
  } | null;
  onCancel: () => void;
  onUpdate: () => void;
}

export function UpdateDeckWarningDialog({
  open,
  onOpenChange,
  communityDeck,
  importedDeck,
  onCancel,
  onUpdate,
}: UpdateDeckWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⚠️ You've Edited This Deck</DialogTitle>
          <DialogDescription>
            Updating will replace all your changes with the community version
          </DialogDescription>
        </DialogHeader>

        {communityDeck && importedDeck && (
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: importedDeck.color }}
                >
                  {importedDeck.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {importedDeck.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your version: {importedDeck.cardCount} cards
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Community version: {communityDeck.cardsCount ?? 0} cards
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your local changes will be lost. What would you like to do?
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel
          </Button>
          <Button
            onClick={onUpdate}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Update Anyway (Lose Changes)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
