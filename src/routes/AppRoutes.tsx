import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { landingRoutes } from "@/features/landing/routes";

// Keep these imports as-is for now (we'll migrate them later)
import { LoginScreen } from "@/components/Auth/Login/LoginScreen";
import { SignUpScreen } from "@/components/Auth/Signup/SignupScreen";
import { ResetPasswordScreen } from "@/components/Auth/Login/ResetPasswordScreen";
import { decksRoutes } from "@/features/decks";
import { StudyOptionsScreen } from "@/components/Study/StudyOptionsScreen";
import { StudyScreen } from "@/components/Study/StudyScreen";
import { communityRoutes } from "@/features/community";
import { ProfileScreen } from "@/components/Profile/ProfileScreen";
import { AIGenerateScreen } from "@/components/AI/AIGenerateScreen";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PaymentSuccessScreen } from "@/components/PaymentSuccessScreen";
import { allCardsRoutes } from "@/features/all-cards";
import { SettingsScreen } from "@/components/Settings/SettingsScreen";
import { SuperuserScreen } from "@/components/Superuser/SuperuserScreen";
import { ModeratorScreen } from "@/components/Moderation/ModeratorScreen";
import { PrivacyPolicyScreen } from "@/components/Legal/PrivacyPolicyScreen";
import { TermsScreen } from "@/components/Legal/TermsScreen";
import { contactRoutes } from "@/features/contact";
import { NotificationsScreen } from "@/components/Notifications/NotificationsScreen";
import ProtectedRoute from "@/components/ProtectedRoute";
import { betaTestingRoutes } from "@/features/beta-testing";

import { IS_BETA_TESTING_ENABLED } from "@/shared/config/featureFlags";

type AppRoutesProps = {
  user: unknown; // keep loose for now; tighten later if you want
  sharedDeckRoute: ReactNode; // pass <SharedDeckRoute /> from App.tsx (uses hooks)
  onCloseUpgrade?: () => void; // optional so App.tsx can keep old behavior
};

export function AppRoutes({
  user,
  sharedDeckRoute,
  onCloseUpgrade,
}: AppRoutesProps) {
  return (
    <Routes>
      {landingRoutes.map((r) => (
        <Route
          key={r.path as string}
          path={r.path as string}
          element={r.element}
        />
      ))}

      {/* everything else stays here for now */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignUpScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />

      {decksRoutes.map((r) => (
        <Route
          key={r.path as string}
          path={r.path as string}
          element={r.element}
        />
      ))}

      <Route
        path="/study-options/:deckId"
        element={
          <ProtectedRoute>
            <StudyOptionsScreen />
          </ProtectedRoute>
        }
      />

      {/* Study route without deckId for all-cards and temporary decks */}
      <Route
        path="/study"
        element={
          <ProtectedRoute>
            <StudyScreen />
          </ProtectedRoute>
        }
      />
      {/* Study route with deckId for regular deck study */}
      <Route
        path="/study/:deckId"
        element={
          <ProtectedRoute>
            <StudyScreen />
          </ProtectedRoute>
        }
      />

      {communityRoutes.map((r) => (
        <Route
          key={r.path as string}
          path={r.path as string}
          element={r.element}
        />
      ))}

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileScreen />
          </ProtectedRoute>
        }
      />

      {/* Beta Testing - Conditional */}
      {IS_BETA_TESTING_ENABLED && betaTestingRoutes}

      <Route
        path="/ai-generate"
        element={
          <ProtectedRoute>
            <AIGenerateScreen />
          </ProtectedRoute>
        }
      />

      <Route
        path="/upgrade"
        element={
          <ProtectedRoute>
            <UpgradeModal
              open={true}
              onOpenChange={(open) => {
                // preserve old behavior: when modal closes, caller decides where to go
                if (!open) onCloseUpgrade?.();
              }}
            />
          </ProtectedRoute>
        }
      />

      <Route path="/payment-success" element={<PaymentSuccessScreen />} />

      {allCardsRoutes.map((r) => (
        <Route
          key={r.path as string}
          path={r.path as string}
          element={r.element}
        />
      ))}

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsScreen />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superuser"
        element={
          <ProtectedRoute>
            <SuperuserScreen />
          </ProtectedRoute>
        }
      />

      <Route
        path="/moderator"
        element={
          <ProtectedRoute>
            <ModeratorScreen />
          </ProtectedRoute>
        }
      />

      <Route path="/privacy" element={<PrivacyPolicyScreen />} />
      <Route path="/terms" element={<TermsScreen />} />
      {contactRoutes.map((r) => (
        <Route
          key={r.path as string}
          path={r.path as string}
          element={r.element}
        />
      ))}

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsScreen />
          </ProtectedRoute>
        }
      />

      {/* hooks route wrapper must be passed in */}
      <Route path="/shared/:shareId" element={sharedDeckRoute} />

      {/* Catch-all */}
      <Route
        path="*"
        element={
          user ? <Navigate to="/decks" replace /> : <Navigate to="/" replace />
        }
      />
    </Routes>
  );
}
