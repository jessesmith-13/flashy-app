import { Context } from "npm:hono@4";
import type { Hono } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import { toCamelCase } from "../../lib/utils/case.ts";
import { UpdateUserProfilePayload, UserRow } from "../../types/users.ts";

export function registerUserProfileRoutes(app: Hono) {
  /**
   * Update own user profile
   */
  app.put("/users/:userId/profile", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const { data, error } = await supabase.auth.getUser(accessToken);
      const authUser = data?.user;

      if (error || !authUser) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const userId = c.req.param("userId");

      // 🔐 Ownership enforcement
      if (authUser.id !== userId) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const body = (await c.req.json()) as UpdateUserProfilePayload;

      const updates: Partial<{
        display_name: string;
        avatar_url: string | null;
        decks_public: boolean;
        subscription_tier: string;
        subscription_expiry: string | null;
        email_notifications_enabled: boolean;
        email_offers: boolean;
        email_comment_replies: boolean;
        email_friend_requests: boolean;
        email_flag_notifications: boolean;
        email_moderation_updates: boolean;
        user_role: string;
        user_role_verified: boolean;
      }> = {};

      if (body.displayName !== undefined) {
        updates.display_name = body.displayName;
      }
      if (body.avatarUrl !== undefined) {
        updates.avatar_url = body.avatarUrl;
      }
      if (body.decksPublic !== undefined) {
        updates.decks_public = body.decksPublic;
      }
      if (body.subscriptionTier !== undefined) {
        updates.subscription_tier = body.subscriptionTier;
      }
      if (body.subscriptionExpiry !== undefined) {
        updates.subscription_expiry = body.subscriptionExpiry;
      }

      // Handle email preferences - ALL 6 TOGGLES
      if (body.emailNotificationsEnabled !== undefined) {
        updates.email_notifications_enabled = body.emailNotificationsEnabled;
      }
      if (body.emailOffers !== undefined) {
        updates.email_offers = body.emailOffers;
      }
      if (body.emailCommentReplies !== undefined) {
        updates.email_comment_replies = body.emailCommentReplies;
      }
      if (body.emailFriendRequests !== undefined) {
        updates.email_friend_requests = body.emailFriendRequests;
      }
      if (body.emailFlaggedContent !== undefined) {
        updates.email_flag_notifications = body.emailFlaggedContent;
      }
      if (body.emailModerationNotices !== undefined) {
        updates.email_moderation_updates = body.emailModerationNotices;
      }

      if (Object.keys(updates).length === 0) {
        const { data: currentUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        return c.json({ user: toCamelCase(currentUser) });
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select()
        .single<UserRow>();

      if (updateError || !updatedUser) {
        return c.json({ error: updateError?.message ?? "Update failed" }, 400);
      }

      // Optional compatibility sync
      if (body.displayName !== undefined || body.avatarUrl !== undefined) {
        await supabase.auth.admin
          .updateUserById(userId, {
            user_metadata: {
              ...authUser.user_metadata,
              ...(body.displayName !== undefined && {
                displayName: body.displayName,
              }),
              ...(body.avatarUrl !== undefined && {
                avatarUrl: body.avatarUrl,
              }),
            },
          })
          .catch(() => {});
      }

      return c.json({ user: toCamelCase(updatedUser) });
    } catch (err) {
      console.error("❌ Update profile error:", err);
      return c.json({ error: "Failed to update profile" }, 500);
    }
  });

  /**
   * Get public user profile
   */
  app.get("/users/:userId/profile", async (c: Context) => {
    try {
      const userId = c.req.param("userId");

      const { data: user, error } = await supabase
        .from("users")
        .select(
          `
          id,
          display_name,
          avatar_url,
          decks_public,
          subscription_tier,
          subscription_expiry,
          is_banned,
          is_moderator,
          email_notifications_enabled,
          email_offers,
          email_comment_replies,
          email_friend_requests,
          email_flag_notifications,
          email_moderation_updates,
          user_role,
          user_role_verified
        `
        )
        .eq("id", userId)
        .single<UserRow>();

      if (error || !user) {
        return c.json({ error: "User not found" }, 404);
      }

      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Extract unlocked achievement IDs array
      const unlockedAchievementIds =
        achievementsData?.unlocked_achievement_ids || [];

      let decks: unknown[] = [];

      if (user.decks_public) {
        const { data: decksData } = await supabase
          .from("decks")
          .select("*")
          .eq("user_id", userId)
          .order("position", { ascending: true });

        decks = decksData ?? [];
      }

      return c.json({
        user: {
          id: user.id,
          displayName: user.display_name,
          name: user.display_name,
          avatarUrl: user.avatar_url,
          decksPublic: user.decks_public,
          subscriptionTier: user.subscription_tier ?? "free",
          subscriptionExpiry: user.subscription_expiry,
          isBanned: user.is_banned,
          isModerator: user.is_moderator,
          // ALL 6 EMAIL PREFERENCES
          emailNotificationsEnabled: user.email_notifications_enabled ?? true,
          emailOffers: user.email_offers ?? true,
          emailCommentReplies: user.email_comment_replies ?? true,
          emailFriendRequests: user.email_friend_requests ?? true,
          emailFlaggedContent: user.email_flag_notifications ?? true,
          emailModerationNotices: user.email_moderation_updates ?? true,
          achievements: unlockedAchievementIds,
          achievementsData: achievementsData || {},
          userRole: user.user_role,
          userRoleVerified: user.user_role_verified,
          decks: toCamelCase(decks),
        },
      });
    } catch (err) {
      console.error("❌ Get profile error:", err);
      return c.json({ error: "Failed to get user profile" }, 500);
    }
  });
}
