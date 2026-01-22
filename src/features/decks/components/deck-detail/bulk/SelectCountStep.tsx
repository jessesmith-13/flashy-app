// src/features/decks/components/deck-detail/bulk/SelectCountStep.tsx
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function SelectCountStep(props: {
  cardCount: string;
  setCardCount: (v: string) => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const { cardCount, setCardCount, onCancel, onNext } = props;

  const n = parseInt(cardCount, 10);
  const disabled = !cardCount || Number.isNaN(n) || n < 1 || n > 50;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Bulk Add Cards</DialogTitle>
        <DialogDescription>
          How many cards would you like to add? (Maximum 50)
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-4">
        <div>
          <Label htmlFor="bulk-cardCount">Number of Cards</Label>
          <Input
            id="bulk-cardCount"
            type="number"
            min="1"
            max="50"
            value={cardCount}
            onChange={(e) => setCardCount(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onNext}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={disabled}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
