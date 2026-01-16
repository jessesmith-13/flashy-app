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
import { Star, Send, Loader2 } from "lucide-react";

interface BetaFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: {
    rating?: number;
    message: string;
    category?: string;
  }) => Promise<void>;
}

export function BetaFeedbackModal({
  open,
  onOpenChange,
  onSubmit,
}: BetaFeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        rating: rating > 0 ? rating : undefined,
        message: message.trim(),
      });

      // Reset form
      setRating(0);
      setHoveredRating(0);
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Flashy! Tell us what's working and what's not.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Rating */}
          <div>
            <Label className="text-sm mb-2 block">
              Overall Experience (Optional)
            </Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {rating === 1 && "Needs a lot of work"}
                {rating === 2 && "Needs improvement"}
                {rating === 3 && "It's okay"}
                {rating === 4 && "Pretty good!"}
                {rating === 5 && "Excellent!"}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="feedback-message" className="text-sm mb-2 block">
              Your Feedback *
            </Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What did you like? What could be better? Found any bugs?"
              className="min-h-[150px]"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Be as detailed as you'd like! We read every comment.
            </p>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-1">
              💡 Helpful feedback includes:
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-0.5 ml-4 list-disc">
              <li>What you were trying to do</li>
              <li>What happened vs. what you expected</li>
              <li>Any error messages you saw</li>
              <li>Your device/browser (if relevant)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !message.trim()}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
