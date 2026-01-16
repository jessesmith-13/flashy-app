import { useNavigation } from "../../shared/hooks/useNavigation";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { TicketManagementPanel } from "./TicketManagementPanel";
import { useIsModerator } from "../../shared/auth/roles";

export function ModeratorScreen() {
  const { navigateTo } = useNavigation();
  const isModerator = useIsModerator();

  // Redirect non-moderators
  if (!isModerator) {
    return (
      <AppLayout>
        <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
          <div className="max-w-4xl mx-auto p-4 lg:p-8">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 text-center border-2 border-red-200 dark:border-red-700">
              <Shield className="w-16 h-16 mx-auto mb-4 text-red-600 dark:text-red-400" />
              <h1 className="text-2xl text-red-900 dark:text-red-100 mb-2">
                Access Denied
              </h1>
              <p className="text-red-700 dark:text-red-300 mb-6">
                You don't have permission to access this page. Moderator
                privileges are required.
              </p>
              <Button
                onClick={() => navigateTo("decks")}
                variant="outline"
                className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigateTo("decks")}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl text-gray-900 dark:text-gray-100">
                  Moderator Tools
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage community content and reports
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Management */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-6 py-4 border-b border-blue-200 dark:border-blue-700">
              <h2 className="text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Flagged Content Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and resolve community-reported content
              </p>
            </div>

            <div className="p-6">
              <TicketManagementPanel />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
