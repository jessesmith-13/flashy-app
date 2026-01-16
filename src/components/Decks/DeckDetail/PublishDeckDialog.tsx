import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { UIDeck } from "@/types/decks";

interface PublishDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: UIDeck;
  cardCount: number;
  publishing: boolean;
  onPublish: () => void;
  onOpenSettings: () => void;
}

export function PublishDeckDialog({
  open,
  onOpenChange,
  deck,
  cardCount,
  publishing,
  onPublish,
  onOpenSettings,
}: PublishDeckDialogProps) {
  const hasRequiredSettings = deck.category && deck.subtopic;
  const cannotRepublish = deck.publishBanned === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Deck to Community</DialogTitle>
          <DialogDescription>
            Share your deck with the community
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {cannotRepublish ? (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
              <h3 className="text-red-900 dark:text-red-100 mb-2">
                Cannot Republish Deck
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                This deck was removed from the community by a moderator and
                cannot be republished.
              </p>
              {deck.publishBannedReason && (
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                  <span className="font-medium">Reason:</span>{" "}
                  {deck.publishBannedReason}
                </p>
              )}
            </div>
          ) : hasRequiredSettings ? (
            <>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: deck.color }}
                  >
                    {deck.emoji}
                  </div>
                  <div>
                    <h3 className="font-medium dark:text-gray-100">
                      {deck.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {cardCount} {cardCount === 1 ? "card" : "cards"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {deck.category}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {deck.subtopic}
                  </span>
                </div>
              </div>

              {deck.communityPublishedId && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This deck is already published. Publishing again will update
                  it with your latest changes.
                </p>
              )}

              <Button
                onClick={onPublish}
                disabled={publishing}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {publishing
                  ? "Publishing..."
                  : deck.communityPublishedId
                  ? "Update Published Deck"
                  : "Publish to Community"}
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Please set a category and subtopic for this deck before
                publishing.
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onOpenSettings();
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Edit Deck Settings
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
