import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { UICommunityDeck } from "@/types/community";

type UnpublishCommunityDeckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: UICommunityDeck | null;
  isLoading: boolean;
  onConfirm: () => void;
};

export function UnpublishCommunityDeckDialog({
  open,
  onOpenChange,
  deck,
  isLoading,
  onConfirm,
}: UnpublishCommunityDeckDialogProps) {
  if (!deck) return null;

  const cardCount = deck.cards?.length ?? deck.cardCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unpublish from Community</DialogTitle>
          <DialogDescription>
            Remove your deck from the Flashy community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: deck.color || "#10B981" }}
              >
                {deck.emoji}
              </div>
              <div>
                <h3 className="font-medium dark:text-gray-100">{deck.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {cardCount} {cardCount === 1 ? "card" : "cards"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {deck.category && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  {deck.category}
                </span>
              )}
              {deck.subtopic && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  {deck.subtopic}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will remove your deck from the community, but you can republish
            it later. Are you sure?
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
              type="button"
            >
              Cancel
            </Button>

            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              type="button"
            >
              {isLoading ? "Unpublishing..." : "Unpublish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
