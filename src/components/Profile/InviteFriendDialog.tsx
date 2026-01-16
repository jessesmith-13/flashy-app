import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Mail, Gift, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { sendReferralInvite } from "../../shared/api/referrals";

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
}

export function InviteFriendDialog({
  open,
  onOpenChange,
  accessToken,
}: InviteFriendDialogProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      const result = await sendReferralInvite(accessToken, email);

      toast.success("Referral invite sent!");
      setReferralLink(result.referralLink);
      setEmail("");

      // Show info about the bonus
      toast.info(
        "When your friend signs up, you both get 1 month of Premium free!",
        {
          duration: 5000,
        }
      );
    } catch (error: any) {
      console.error("Failed to send referral:", error);
      toast.error(error.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail("");
    setReferralLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-500" />
            Invite a Friend
          </DialogTitle>
          <DialogDescription>
            Send an invite and you both get 1 month of Premium free when they
            sign up!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reward Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-sm text-emerald-900 dark:text-emerald-100">
                  Referral Reward
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300">
                  Both you and your friend get 1 month of Premium when they sign
                  up
                </div>
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">
              Friend&apos;s Email
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendInvite();
                    }
                  }}
                  className="pl-10"
                  disabled={sending}
                />
              </div>
              <Button
                onClick={handleSendInvite}
                disabled={!email || sending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>

          {/* Generated Referral Link */}
          {referralLink && (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Label className="text-sm">Referral Link (for testing)</Label>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="text-xs" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Note: In production, this would be sent via email. For testing,
                copy this link and use it to sign up.
              </p>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              • Your friend will receive a signup link with your referral code
            </p>
            <p>• When they complete signup, you both get 1 month of Premium</p>
            <p>• If you already have Premium, it will be extended by 1 month</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
