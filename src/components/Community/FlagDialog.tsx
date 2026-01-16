import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createFlag } from "../../../utils/api/moderation";

interface FlagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "deck" | "user" | "comment" | "card";
  targetId: string;
  targetName: string;
  accessToken: string | null;
  targetDetails?: any; // Additional context like deckId for cards/comments
}

const FLAG_REASONS = [
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment / hate" },
  { value: "misinformation", label: "Misinformation" },
  { value: "copyright", label: "Copyright violation" },
  { value: "other", label: "Other" },
] as const;

export function FlagDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  accessToken,
  targetDetails,
}: FlagDialogProps) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!accessToken) {
      toast.error("You must be logged in to report content");
      return;
    }

    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setSubmitting(true);

    try {
      await createFlag(accessToken, {
        targetType,
        targetId,
        reason: reason as any,
        ...(notes.trim() && { notes: notes.trim() }),
        ...(targetDetails && { targetDetails }),
      });

      toast.success(
        "Report submitted successfully. Thank you for helping keep our community safe!"
      );
      onOpenChange(false);

      // Reset form
      setReason("");
      setNotes("");
    } catch (error: any) {
      if (error.message.includes("already flagged")) {
        toast.error("You have already reported this item");
      } else {
        toast.error(error.message || "Failed to submit report");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const targetTypeLabel =
    targetType === "deck"
      ? "Deck"
      : targetType === "user"
      ? "User"
      : targetType === "card"
      ? "Card"
      : "Comment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <DialogTitle>Report {targetTypeLabel}</DialogTitle>
          </div>
          <DialogDescription>
            Report inappropriate or harmful content. Our team will review your
            report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm text-gray-600 dark:text-gray-400">
              You are reporting:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {targetName}
              </span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {FLAG_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional details (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Provide any additional context that might be helpful..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {notes.length}/500 characters
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Submitting false reports may result in
              action being taken against your account.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
