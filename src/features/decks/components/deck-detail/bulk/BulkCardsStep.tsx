import type { ReactNode } from "react";
import type { CardFormData } from "../BulkAddCardsDialog";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Loader2, Plus } from "lucide-react";

export function BulkCardsStep(props: {
  cards: CardFormData[];
  filledCount: number;
  submitting: boolean;

  onBack: () => void;
  onCancel: () => void;
  onAddCard: () => void;
  onSubmit: () => void;

  renderCard: (card: CardFormData, index: number) => ReactNode;
}) {
  const {
    cards,
    filledCount,
    submitting,
    onBack,
    onCancel,
    onAddCard,
    onSubmit,
    renderCard,
  } = props;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add {cards.length} Cards</DialogTitle>
        <DialogDescription>
          Fill in the details for each card. All card types and features are
          supported.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
          {cards.map((card, index) => renderCard(card, index))}
        </div>

        {cards.length < 50 && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddCard}
            className="w-full border-dashed border-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Card
          </Button>
        )}

        <div className="flex gap-2 justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={submitting}
          >
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={onSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={submitting || filledCount === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Cards...
                </>
              ) : (
                `Add ${filledCount} Cards`
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
