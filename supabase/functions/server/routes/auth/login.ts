import { Context } from "npm:hono@4";
import type { Hono } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import { requireUserId } from "../../lib/auth.ts";

export function registerLoginRoutes(app: Hono) {
  app.post("/auth/login", async (c: Context) => {
    try {
      const userId = await requireUserId(c); // ✅ validates JWT using anon client
      if (!userId) return c.json({ error: "Unauthorized" }, 401);
      console.log("USER ID: ", userId);

      // Fetch user profile from database
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          name,
          display_name,
          avatar_url,
          decks_public,
          subscription_tier,
          subscription_expiry,
          subscription_cancelled_at_period_end,
          is_superuser,
          is_moderator,
          is_banned,
          banned_reason,
          banned_at,
          banned_by,
          user_role,
          user_role_verified
        `
        )
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Database error fetching signin profile:", profileError);
        return c.json({ error: "Failed to fetch user profile" }, 500);
      }

      if (!profile) {
        return c.json({ error: "User profile not found" }, 404);
      }

      // 🚫 Check if user is banned
      if (profile.is_banned) {
        console.log("=== BANNED USER ATTEMPTED LOGIN ===");
        console.log("User ID:", profile.id);
        console.log("Email:", profile.email);
        console.log(
          "Ban Reason:",
          profile.banned_reason || "No reason provided"
        );
        console.log("Banned At:", profile.banned_at);
        console.log("Banned By:", profile.banned_by);
        console.log("===================================");

        return c.json(
          {
            error: "Account banned",
            banned: true,
            banReason: profile.banned_reason || "",
            bannedAt: profile.banned_at,
            bannedBy: profile.banned_by,
          },
          403
        );
      }

      // ✅ Return fresh profile data
      return c.json({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        decksPublic: profile.decks_public,
        subscriptionTier: profile.subscription_tier,
        subscriptionExpiry: profile.subscription_expiry,
        subscriptionCancelledAtPeriodEnd:
          profile.subscription_cancelled_at_period_end,
        isSuperuser: profile.is_superuser,
        isModerator: profile.is_moderator,
        isBanned: profile.is_banned,
        userRole: profile.user_role,
        userRoleVerified: profile.user_role_verified,
      });
    } catch (error) {
      console.error("Error in signin-profile endpoint:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
