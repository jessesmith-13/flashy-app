import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../../../hooks/useNavigation";
import { AppLayout } from "@/components/Layout/AppLayout";
import { ArrowLeft, Shield, Trash2, Flag, Users, History } from "lucide-react";
import { TicketManagementPanel } from "@/components/Moderation/TicketManagementPanel";
import { DeletedItemsPanel } from "./DeletedItemsPanel";
import { UserManagementPanel } from "./UserManagementPanel";
import { UserActivityPanel } from "./UserActivityPanel";
import { useIsSuperuser } from "../../../utils/userUtils";
import { Button } from "@/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { useState } from "react";

export function SuperuserScreen() {
  const { accessToken } = useStore();
  const { navigateTo } = useNavigation();
  const isSuperuser = useIsSuperuser();
  const [activeTab, setActiveTab] = useState("flags");

  // Redirect non-superusers
  if (!isSuperuser) {
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
                You don't have permission to access this page. Superuser
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl text-gray-900 dark:text-gray-100">
                  Superuser Tools
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage reports, users, and content moderation
                </p>
              </div>
            </div>
          </div>

          {/* Tools Sections */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1 lg:w-auto lg:inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <TabsTrigger value="flags" className="gap-2">
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Flag Management</span>
                <span className="sm:hidden">Flags</span>
              </TabsTrigger>
              <TabsTrigger value="deleted" className="gap-2">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Deleted Items</span>
                <span className="sm:hidden">Deleted</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">User Management</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">User Activity</span>
                <span className="sm:hidden">Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="flags" className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200 dark:border-gray-700">
                {accessToken && <TicketManagementPanel />}
              </div>
            </TabsContent>

            <TabsContent value="deleted" className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200 dark:border-gray-700">
                {accessToken && <DeletedItemsPanel accessToken={accessToken} />}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200 dark:border-gray-700">
                {accessToken && (
                  <UserManagementPanel accessToken={accessToken} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200 dark:border-gray-700">
                {accessToken && <UserActivityPanel accessToken={accessToken} />}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
