import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import { Label } from "@/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Textarea } from "@/ui/textarea";

interface DeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  targetType?: "deck" | "card" | "comment";
  targetId?: string;
  targetName?: string;
  onConfirm: (reason: string) => Promise<void>;
}

export function DeletionDialog({
  open,
  onOpenChange,
  title,
  description,
  targetType,
  targetName,
  onConfirm,
}: DeletionDialogProps) {
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const defaultTitle =
    title ||
    `Delete ${targetType?.charAt(0).toUpperCase()}${targetType?.slice(1)}`;
  const defaultDescription =
    description ||
    `Please select a reason for deleting this ${targetType}. The user will be notified with your reason.`;

  const handleConfirm = async () => {
    const fullReason = deleteMessage.trim()
      ? `${deleteReason}: ${deleteMessage.trim()}`
      : deleteReason;

    setIsDeleting(true);
    try {
      await onConfirm(fullReason);
      // Reset fields on successful deletion
      setDeleteReason("");
      setDeleteMessage("");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{defaultTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {defaultDescription}
            {targetName && (
              <span className="block mt-2 font-medium text-gray-700 dark:text-gray-300">
                {targetName}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label
              htmlFor="delete-reason"
              className="text-sm font-medium mb-2 block"
            >
              Reason for deletion *
            </Label>
            <Select value={deleteReason} onValueChange={setDeleteReason}>
              <SelectTrigger id="delete-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inappropriate Content">
                  Inappropriate Content
                </SelectItem>
                <SelectItem value="Harassment or Bullying">
                  Harassment or Bullying
                </SelectItem>
                <SelectItem value="Spam">Spam</SelectItem>
                <SelectItem value="Misinformation">Misinformation</SelectItem>
                <SelectItem value="Copyright Violation">
                  Copyright Violation
                </SelectItem>
                <SelectItem value="Low Quality">Low Quality</SelectItem>
                <SelectItem value="Violation of Community Guidelines">
                  Violation of Community Guidelines
                </SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              htmlFor="delete-message"
              className="text-sm font-medium mb-2 block"
            >
              Additional details (optional)
            </Label>
            <Textarea
              id="delete-message"
              value={deleteMessage}
              onChange={(e) => setDeleteMessage(e.target.value)}
              placeholder="Add any additional context..."
              className="w-full min-h-[80px]"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || !deleteReason}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
