import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Link as LinkIcon,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import * as api from "../shared/api/decks";
import { QRCodeSVG } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface ShareDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  deckName: string;
  isCommunityDeck?: boolean;
  accessToken: string | null;
}

export function ShareDeckDialog({
  open,
  onOpenChange,
  deckId,
  deckName,
  isCommunityDeck = false,
  accessToken,
}: ShareDeckDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"url" | "qr">("url");

  const handleGenerateLink = async () => {
    if (!accessToken) {
      toast.error("Please log in to share decks");
      return;
    }

    setGenerating(true);
    try {
      const result = await api.createShareLink(
        accessToken,
        deckId,
        isCommunityDeck
      );
      const fullUrl = `${window.location.origin}/#/shared/${result.shareId}`;
      setShareUrl(fullUrl);
      toast.success("Share link created!");
    } catch (error: any) {
      console.error("Failed to create share link:", error);
      toast.error("Failed to create share link");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        // Try modern clipboard API first
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        // Fallback method for when Clipboard API is blocked (don't log expected error)
        try {
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          const successful = document.execCommand("copy");
          textArea.remove();

          if (successful) {
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
          } else {
            console.error(
              "Failed to copy link - both clipboard methods failed"
            );
            toast.error("Failed to copy link. Please copy manually.");
          }
        } catch (fallbackError) {
          console.error(
            "Failed to copy link - both clipboard methods failed:",
            fallbackError
          );
          toast.error("Failed to copy link. Please copy manually.");
        }
      }
    }
  };

  const handleDownloadQR = () => {
    if (!shareUrl) return;

    try {
      // Get the SVG element
      const svg = document.getElementById("share-qr-code");
      if (!svg) return;

      // Create a canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size (QR code size + padding)
      const size = 300;
      canvas.width = size;
      canvas.height = size;

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        // Draw white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);

        // Draw QR code
        ctx.drawImage(img, 0, 0, size, size);

        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${deckName.replace(/[^a-z0-9]/gi, "_")}_QR.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("QR code downloaded!");
          }
        });

        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast.error("Failed to download QR code");
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setCopied(false);
    setActiveTab("url");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Deck
          </DialogTitle>
          <DialogDescription>
            Create a read-only link to share "{deckName}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!shareUrl ? (
            <div className="text-center py-6">
              <Share2 className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Generate a shareable link that allows anyone to view and study
                this deck
              </p>
              <Button
                onClick={handleGenerateLink}
                disabled={generating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generating ? "Generating..." : "Generate Share Link"}
              </Button>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "url" | "qr")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  URL Link
                </TabsTrigger>
                <TabsTrigger value="qr" className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Share URL:
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                    {shareUrl}
                  </p>
                </div>

                <Button
                  onClick={handleCopyLink}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Anyone with this link can view and study the deck
                </p>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4 mt-4">
                <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <QRCodeSVG
                      id="share-qr-code"
                      value={shareUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Scan this QR code to access the deck
                  </p>
                </div>

                <Button
                  onClick={handleDownloadQR}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Anyone who scans this QR code can view and study the deck
                </p>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
