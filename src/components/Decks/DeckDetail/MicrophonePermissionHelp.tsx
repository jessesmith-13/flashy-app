import { Info, X } from "lucide-react";
import { Button } from "@/ui/button";

interface MicrophonePermissionHelpProps {
  onClose: () => void;
}

export function MicrophonePermissionHelp({
  onClose,
}: MicrophonePermissionHelpProps) {
  // Detect browser
  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg"))
      return "Chrome";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
      return "Safari";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Edg")) return "Edge";
    return "Other";
  };

  const browser = getBrowserName();

  const getInstructions = () => {
    switch (browser) {
      case "Chrome":
      case "Edge":
        return [
          "Click the lock icon or camera icon in the address bar",
          'Find "Microphone" in the permissions list',
          'Select "Allow" from the dropdown',
          "Refresh the page and try recording again",
        ];
      case "Safari":
        return [
          "Go to Safari menu → Settings (or Preferences)",
          'Click the "Websites" tab',
          'Select "Microphone" from the left sidebar',
          'Find this website and change permission to "Allow"',
          "Refresh the page and try recording again",
        ];
      case "Firefox":
        return [
          "Click the lock icon in the address bar",
          'Find "Use the Microphone" in the permissions',
          "Click the X to clear the blocked status",
          "Try recording again - Firefox will prompt you to allow access",
        ];
      default:
        return [
          "Look for a camera or microphone icon in your address bar",
          "Click it to access permissions settings",
          "Enable microphone access for this website",
          "Refresh the page and try recording again",
        ];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Info className="size-6 text-blue-600" />
              <h2 className="font-semibold">Enable Microphone Access</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Browser-specific instructions */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              To record audio, you need to allow microphone access in your
              browser.
            </p>

            {/* First-time permission prompt */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900 mb-2">
                First time recording?
              </p>
              <p className="text-sm text-green-800">
                When you click the "Record" button, your browser will show a
                popup asking for microphone permission. Click "Allow" to enable
                recording.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                If you previously denied access - Instructions for {browser}:
              </p>
              <ol className="space-y-2 text-sm text-blue-800">
                {getInstructions().map((instruction, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-medium">{index + 1}.</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* General tips */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Still having trouble?
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Make sure your microphone is properly connected</li>
                <li>• Check that no other app is using your microphone</li>
                <li>• Try closing and reopening your browser</li>
                <li>
                  • As an alternative, you can upload audio files instead of
                  recording
                </li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="default" onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
