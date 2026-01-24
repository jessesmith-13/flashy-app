import { Button } from "@/shared/ui/button";
import { Dialog, DialogTrigger } from "@/shared/ui/dialog";
import { Upload } from "lucide-react";
import { canPublishToCommunity } from "@/shared/entitlements/subscription";
import type { UIDeck } from "@/types/decks";
import { PublishDeckDialog } from "../dialogs/PublishDeckDialog";
import { SubscriptionTier } from "@/types/users";

type Props = {
  user: {
    subscriptionTier?: SubscriptionTier;
    isSuperuser?: boolean;
    isModerator?: boolean;
  } | null;

  decks: UIDeck[];

  actions: {
    publishDialogOpen: boolean;
    setPublishDialogOpen: (open: boolean) => void;
    publishableDecks: UIDeck[];
    selectedDeckId: string;
    setSelectedDeckId: (id: string) => void;
    publishing: boolean;
    handlePublishDeck: () => Promise<void>;
  };

  setUpgradeFeature: (f?: string) => void;
  setUpgradeModalOpen: (open: boolean) => void;
};

export function CommunityPageHeader({
  user,
  decks,
  actions,
  setUpgradeFeature,
  setUpgradeModalOpen,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
          Community Decks
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Discover and share decks with learners worldwide
        </p>
      </div>

      <Dialog
        open={actions.publishDialogOpen}
        onOpenChange={actions.setPublishDialogOpen}
      >
        <DialogTrigger asChild>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10"
            onClick={(e) => {
              if (
                !canPublishToCommunity(
                  user?.subscriptionTier,
                  user?.isSuperuser,
                  user?.isModerator,
                )
              ) {
                e.preventDefault();
                setUpgradeFeature("community publishing");
                setUpgradeModalOpen(true);
              }
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Publish Deck
          </Button>
        </DialogTrigger>

        <PublishDeckDialog
          publishableDecks={actions.publishableDecks}
          allDecks={decks}
          selectedDeckId={actions.selectedDeckId}
          setSelectedDeckId={actions.setSelectedDeckId}
          publishing={actions.publishing}
          onPublish={actions.handlePublishDeck}
        />
      </Dialog>
    </div>
  );
}
