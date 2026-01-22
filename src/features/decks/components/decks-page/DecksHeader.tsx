import { Crown, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { CreateDeckDialog, type CreateDeckPayload } from "./CreateDeckDialog";

interface DecksHeaderProps {
  isFree: boolean;
  onUpgrade: () => void;
  onCreateClick: () => void;

  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;

  // IMPORTANT: must be Promise<void> because CreateDeckDialog requires it
  onCreateDeck: (data: CreateDeckPayload) => Promise<void>;
}

export function DecksHeader({
  isFree,
  onUpgrade,
  onCreateClick,
  createDialogOpen,
  setCreateDialogOpen,
  onCreateDeck,
}: DecksHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-2 sm:gap-4">
      <div className="min-w-0 flex-shrink overflow-hidden">
        <h1 className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2 dark:text-gray-100 truncate">
          My Decks
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base">
          Choose a deck to start studying
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {isFree && (
          <Button
            onClick={onUpgrade}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-9 sm:h-10 lg:h-12 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm lg:text-base"
          >
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="hidden lg:inline">Upgrade</span>
            <span className="lg:hidden">Pro</span>
          </Button>
        )}

        <Button
          onClick={onCreateClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 sm:h-10 lg:h-12 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm lg:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Create New Deck</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      <CreateDeckDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateDeck={onCreateDeck}
      />
    </div>
  );
}
