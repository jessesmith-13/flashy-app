import { useState } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../../../hooks/useNavigation";
import { updateProfile } from "../../../utils/api/users";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Crown, AlertCircle } from "lucide-react";
import { SubscriptionSection } from "./SubscriptionSection";
import { NotificationsSection } from "./NotificationsSection";
import {
  cancelSubscription,
  changeSubscriptionPlan,
} from "../../../utils/api/subscriptions";
import { AppearanceSection } from "./AppearanceSection";
import { DataPrivacySection } from "./DataPrivacySection";
import { DangerZoneSection } from "./DangerZoneSection";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { ChangePlanDialog } from "./ChangePlanDialog";
import { PlanSelectionDialog } from "./PlanSelectionDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

export function SettingsScreen() {
  const {
    darkMode,
    setDarkMode,
    userAchievements,
    setUserAchievements,
    user,
    accessToken,
    updateUser,
    ttsProvider,
    setTTSProvider,
  } = useStore();
  const { navigateTo } = useNavigation();

  // Debug logging
  console.log("🔐 Settings - User:", user);
  console.log("🔐 Settings - Subscription Tier:", user?.subscriptionTier);
  console.log("🔐 Settings - Subscription Expiry:", user?.subscriptionExpiry);
  console.log("🔐 Settings - Is Superuser:", user?.isSuperuser);
  console.log("🔐 Settings - Is Moderator:", user?.isModerator);
  console.log("🔐 Settings - accessToken:", accessToken ? "exists" : "missing");

  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotificationsEnabled ?? true
  );
  const [emailOffers, setEmailOffers] = useState(user?.emailOffers ?? true);
  const [emailCommentReplies, setEmailCommentReplies] = useState(
    user?.emailCommentReplies ?? true
  );
  const [emailFriendRequests, setEmailFriendRequests] = useState(
    user?.emailFriendRequests ?? true
  );
  const [emailFlaggedContent, setEmailFlaggedContent] = useState(
    user?.emailFlaggedContent ?? true
  );
  const [emailModerationNotices, setEmailModerationNotices] = useState(
    user?.emailModerationNotices ?? true
  );

  // Initialize from user data, default to false if undefined
  const [decksPublic, setDecksPublic] = useState(user?.decksPublic ?? false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showPlanSelectionDialog, setShowPlanSelectionDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    "monthly" | "annual" | "lifetime"
  >("monthly");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [fixingTier, setFixingTier] = useState(false);

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);

    // Unlock dark mode achievement if studying in dark mode
    if (enabled && userAchievements && !userAchievements.studiedInDarkMode) {
      setUserAchievements({
        ...userAchievements,
        studiedInDarkMode: true,
      });
    }
  };

  const handleDecksPublicToggle = async (enabled: boolean) => {
    if (!accessToken) return;

    setDecksPublic(enabled);

    try {
      if (!user?.id || !accessToken) return;
      await updateProfile(user.id, accessToken, {
        decksPublic: enabled,
      });

      // Update local state
      updateUser({
        decksPublic: enabled,
      });

      toast.success(enabled ? "Decks are now public" : "Decks are now private");
    } catch (error) {
      console.error("Failed to update decks visibility:", error);
      toast.error("Failed to update decks visibility");
      // Revert the toggle on error
      setDecksPublic(!enabled);
    }
  };

  const handleEmailPreferenceChange = async (
    field: string,
    enabled: boolean
  ) => {
    if (!accessToken || !user?.id) return;

    try {
      await updateProfile(user.id, accessToken, {
        [field]: enabled,
      });

      // Update local state
      updateUser({
        [field]: enabled,
      });

      toast.success("Email preferences updated");
    } catch (error) {
      console.error("Failed to update email preferences:", error);
      toast.error("Failed to update email preferences");
    }
  };

  const handleExportData = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    toast.loading("Preparing your data export...", { id: "export" });

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/server/support/export-data`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export data");
      }

      const data = await response.json();

      // Create a formatted JSON string
      const jsonString = JSON.stringify(data, null, 2);

      // Create a blob and download it
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Create filename with current date
      const date = new Date().toISOString().split("T")[0];
      a.download = `flashy-data-export-${date}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Your data has been exported successfully!", {
        id: "export",
      });

      // Show summary
      if (data.metadata) {
        toast.info(
          `Exported: ${data.metadata.totalDecks} decks, ${data.metadata.totalCards} cards, ${data.metadata.totalStudySessions} study sessions`,
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      console.error("Failed to export data:", error);
      toast.error(error.message || "Failed to export data", { id: "export" });
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Please contact support to delete your account");
  };

  const handleFixSubscriptionTier = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    setFixingTier(true);
    toast.loading("Fixing subscription tier...", { id: "fix-tier" });

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/server/stripe/users/fix-subscription-tier`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fix subscription tier");
      }

      const data = await response.json();

      // Refresh session to get updated metadata
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Error refreshing session after fix:", error);
      }

      if (session?.user) {
        // Update local state with the new metadata
        updateUser({
          subscriptionTier: session.user.user_metadata?.subscriptionTier,
        });
      }

      toast.success(data.message, { id: "fix-tier" });

      // Reload the page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Failed to fix subscription tier:", error);
      toast.error(error.message || "Failed to fix subscription tier", {
        id: "fix-tier",
      });
    } finally {
      setFixingTier(false);
    }
  };

  const getSubscriptionDisplay = () => {
    // Show actual subscription tier, not role-based display
    if (!user?.subscriptionTier || user?.subscriptionTier === "free") {
      return { name: "Free", color: "gray", icon: Crown };
    }

    switch (user.subscriptionTier) {
      case "lifetime":
        return { name: "Lifetime Premium", color: "purple", icon: Crown };
      case "annual":
        return { name: "Annual Premium", color: "emerald", icon: Crown };
      case "monthly":
        return { name: "Monthly Premium", color: "blue", icon: Crown };
      default:
        // Handle invalid tier (like old "premium" value)
        console.warn("Invalid subscription tier:", user.subscriptionTier);
        return { name: "Free", color: "gray", icon: Crown };
    }
  };

  const handleCancelSubscription = async () => {
    if (!accessToken) return;

    setCancelling(true);
    try {
      // Cancel subscription via Stripe API
      const result = await cancelSubscription(accessToken);

      console.log("Subscription cancelled:", result);

      // ✅ UPDATE ZUSTAND STORE WITH DATABASE DATA
      updateUser({
        subscriptionTier: result.newPlan,
        subscriptionExpiry: result.subscriptionExpiry,
        subscriptionCancelledAtPeriodEnd: false,
        stripeSubscriptionId:
          result.newPlan === "lifetime" ? null : user?.stripeSubscriptionId,
      });

      toast.success(
        "Subscription cancelled. You'll have access until the end of your billing period."
      );
      setShowCancelDialog(false);
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleChangePlan = async () => {
    if (!accessToken) return;

    setChangingPlan(true);
    try {
      // Change subscription via Stripe API
      const result = await changeSubscriptionPlan(accessToken, selectedPlan);

      console.log("✅ Subscription changed:", result);

      // ✅ UPDATE ZUSTAND STORE WITH DATABASE DATA
      updateUser({
        subscriptionTier: result.newPlan,
        subscriptionExpiry: result.subscriptionExpiry,
        subscriptionCancelledAtPeriodEnd: false,
        stripeSubscriptionId:
          result.newPlan === "lifetime" ? null : user?.stripeSubscriptionId,
      });

      const planNames = {
        monthly: "Monthly",
        annual: "Annual",
        lifetime: "Lifetime",
      };
      toast.success(
        `Successfully changed to ${planNames[selectedPlan]} Premium!`
      );
      setShowChangePlanDialog(false);
      setShowPlanSelectionDialog(false);
    } catch (error: any) {
      console.error("❌ Failed to change subscription:", error);
      toast.error(
        error.message || "Failed to change subscription. Please try again."
      );
    } finally {
      setChangingPlan(false);
    }
  };

  const handleSelectPlan = (plan: "monthly" | "annual" | "lifetime") => {
    setSelectedPlan(plan);
    setShowPlanSelectionDialog(false);
    setShowChangePlanDialog(true);
  };

  const isPremiumSubscription = !!(
    user?.subscriptionTier &&
    ["monthly", "annual", "lifetime"].includes(user.subscriptionTier)
  );
  const canCancelSubscription = !!(
    user?.subscriptionTier &&
    ["monthly", "annual"].includes(user.subscriptionTier)
  );
  const subscriptionInfo = getSubscriptionDisplay();

  // Superusers and moderators should also be considered premium
  const effectiveIsPremium = !!(
    isPremiumSubscription ||
    user?.isSuperuser ||
    user?.isModerator
  );

  // Check if subscription tier is invalid
  const hasInvalidTier =
    user?.subscriptionTier &&
    !["free", "monthly", "annual", "lifetime"].includes(user.subscriptionTier);

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your app preferences
            </p>
          </div>

          {/* Invalid Subscription Tier Warning */}
          {hasInvalidTier && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <span className="font-medium">
                      Invalid Subscription Tier Detected:
                    </span>{" "}
                    Your subscription tier is set to "{user?.subscriptionTier}"
                    which is not valid.
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    {user?.isModerator || user?.isSuperuser
                      ? "Don't worry - you still have all premium features through your moderator/superuser role. Click below to clean up your account data."
                      : "This needs to be fixed. Click below to correct your subscription tier."}
                  </p>
                  <Button
                    onClick={handleFixSubscriptionTier}
                    disabled={fixingTier}
                    className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    {fixingTier ? "Fixing..." : "Fix Subscription Tier"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Sections */}
          <div className="space-y-6">
            <SubscriptionSection
              user={user}
              isPremiumSubscription={isPremiumSubscription}
              canCancelSubscription={canCancelSubscription}
              subscriptionInfo={subscriptionInfo}
              onUpgrade={() => navigateTo("upgrade")}
              onCancelSubscription={() => setShowCancelDialog(true)}
              onChangePlan={() => setShowPlanSelectionDialog(true)}
            />

            <NotificationsSection
              userEmail={user?.email}
              emailNotifications={emailNotifications}
              emailOffers={emailOffers}
              emailCommentReplies={emailCommentReplies}
              emailFriendRequests={emailFriendRequests}
              emailFlaggedContent={emailFlaggedContent}
              emailModerationNotices={emailModerationNotices}
              onEmailNotificationsChange={(v) => {
                setEmailNotifications(v);
                handleEmailPreferenceChange("emailNotificationsEnabled", v); // ✅ Was: email_notifications
              }}
              onEmailOffersChange={(v) => {
                setEmailOffers(v);
                handleEmailPreferenceChange("emailOffers", v); // ✅ Was: email_offers
              }}
              onEmailCommentRepliesChange={(v) => {
                setEmailCommentReplies(v);
                handleEmailPreferenceChange("emailCommentReplies", v); // ✅ Was: email_comment_replies
              }}
              onEmailFriendRequestsChange={(v) => {
                setEmailFriendRequests(v);
                handleEmailPreferenceChange("emailFriendRequests", v); // ✅ Was: email_friend_requests
              }}
              onEmailFlaggedContentChange={(v) => {
                setEmailFlaggedContent(v);
                handleEmailPreferenceChange("emailFlaggedContent", v); // ✅ Was: email_flag_notifications
              }}
              onEmailModerationNoticesChange={(v) => {
                setEmailModerationNotices(v);
                handleEmailPreferenceChange("emailModerationNotices", v); // ✅ Was: email_moderation_updates
              }}
            />

            <AppearanceSection
              darkMode={darkMode}
              onDarkModeChange={handleDarkModeToggle}
              ttsProvider={ttsProvider}
              onTTSProviderChange={setTTSProvider}
              isPremium={effectiveIsPremium}
            />

            <DataPrivacySection
              decksPublic={decksPublic}
              onDecksPublicChange={handleDecksPublicToggle}
              onExportData={handleExportData}
            />

            <DangerZoneSection
              onDeleteAccount={() => setShowDeleteDialog(true)}
            />
          </div>
        </div>
      </div>

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        subscriptionName={subscriptionInfo.name}
        cancelling={cancelling}
        onConfirm={handleCancelSubscription}
      />

      <ChangePlanDialog
        open={showChangePlanDialog}
        onOpenChange={setShowChangePlanDialog}
        currentPlan={
          user?.subscriptionTier as "monthly" | "annual" | "lifetime"
        }
        newPlan={selectedPlan}
        changing={changingPlan}
        onConfirm={handleChangePlan}
      />

      <PlanSelectionDialog
        open={showPlanSelectionDialog}
        onOpenChange={setShowPlanSelectionDialog}
        currentPlan={user?.subscriptionTier || "monthly"}
        onSelectPlan={handleSelectPlan}
      />

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAccount}
      />
    </AppLayout>
  );
}
