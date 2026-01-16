import { Button } from "@/ui/button";
import { Switch } from "@/ui/switch";
import { Label } from "@/ui/label";
import { Download, Eye } from "lucide-react";

interface DataPrivacySectionProps {
  decksPublic: boolean;
  onDecksPublicChange: (checked: boolean) => void;
  onExportData: () => void;
}

export function DataPrivacySection({
  decksPublic,
  onDecksPublicChange,
  onExportData,
}: DataPrivacySectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg text-gray-900 dark:text-gray-100 mb-4">
        Data & Privacy
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <Label htmlFor="decksPublic" className="text-sm">
                Make Decks Public
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow others to view your decks on your profile
              </p>
            </div>
          </div>
          <Switch
            id="decksPublic"
            checked={decksPublic}
            onCheckedChange={onDecksPublicChange}
          />
        </div>

        <div className="pt-4 border-t dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onExportData}
            className="w-full justify-start"
          >
            <Download className="w-4 h-4 mr-2" />
            Export My Data
          </Button>
        </div>
      </div>
    </div>
  );
}
