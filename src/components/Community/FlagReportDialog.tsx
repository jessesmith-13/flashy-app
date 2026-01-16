import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Flag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface FlagReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "deck" | "card";
  itemId: string;
  itemName: string;
  onFlagSubmit: (itemId: string, reason: string, details: string) => void;
}

export function FlagReportDialog({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  onFlagSubmit,
}: FlagReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    {
      value: "incorrect",
      label: "⚠️ Incorrect or Misleading",
      description: "Information is wrong, outdated, or misleading",
    },
    {
      value: "spam",
      label: "🚫 Spam or Inappropriate",
      description: "Contains spam, profanity, or inappropriate content",
    },
  ];

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Please select a reason");
      return;
    }

    setSubmitting(true);
    try {
      await onFlagSubmit(itemId, selectedReason, additionalDetails);
      toast.success(
        `${itemType === "deck" ? "Deck" : "Card"} has been flagged for review`
      );
      onOpenChange(false);
      setSelectedReason("");
      setAdditionalDetails("");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Failed to submit report");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-600" />
            Report {itemType === "deck" ? "Deck" : "Card"}
          </DialogTitle>
          <DialogDescription>
            Flag "{itemName}" for moderator review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="mb-3 block">Reason for report</Label>
            <div className="space-y-3">
              {reasons.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedReason === reason.value
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-sm"
                      : "border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-gray-100 mb-1">
                      {reason.label}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {reason.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide more context about this report..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Reports are reviewed by moderators. The {itemType} will remain
              publicly available until reviewed. False reports may result in
              account restrictions.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedReason("");
              setAdditionalDetails("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
