import type { Context, Hono } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import * as emailService from "../../lib/emailService.ts";

export function registerSignupRoutes(app: Hono) {
  app.post("/auth/signup", async (c: Context) => {
    try {
      const { email, password, name, userRole } = await c.req.json();

      // ------------------------------------------------------------
      // Validation
      // ------------------------------------------------------------
      if (!email || !password || !name) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      if (password.length < 6) {
        return c.json({ error: "Password must be at least 6 characters" }, 400);
      }

      const normalizedName = name.trim().toLowerCase();

      // ------------------------------------------------------------
      // Check display name
      // ------------------------------------------------------------
      const { data: existingUser, error: nameCheckError } = await supabase
        .from("users")
        .select("id")
        .ilike("display_name", normalizedName)
        .maybeSingle();

      if (nameCheckError) {
        console.error("❌ Display name check failed:", nameCheckError.message);
        return c.json({ error: "Failed to validate display name" }, 500);
      }

      if (existingUser) {
        return c.json({ error: "Display name is already taken" }, 400);
      }

      // ------------------------------------------------------------
      // Create auth user
      // ------------------------------------------------------------
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name,
            displayName: name,
          },
        });

      if (authError || !authData?.user) {
        console.error("❌ Auth signup failed:", authError?.message);
        return c.json({ error: authError?.message || "Signup failed" }, 400);
      }

      const userId = authData.user.id;

      // ------------------------------------------------------------
      // Insert DB user
      // ------------------------------------------------------------
      const now = new Date().toISOString();

      const { error: dbError } = await supabase.from("users").upsert({
        id: userId,
        email,
        name,
        display_name: name,
        avatar_url: null,
        decks_public: false,
        subscription_tier: "free",
        is_superuser: false,
        is_moderator: false,
        is_banned: false,
        is_reported: false,
        terms_accepted_at: now,
        privacy_accepted_at: now,
        user_role: userRole || null,
        user_role_verified: false,
        verified_at: null,
        created_at: now,
        updated_at: now,
      });

      if (dbError) {
        console.error("❌ Failed to create DB user:", dbError.message);
        await supabase.auth.admin.deleteUser(userId);

        return c.json({ error: "Failed to create user profile" }, 500);
      }

      // ------------------------------------------------------------
      // Send welcome email (async)
      // ------------------------------------------------------------
      emailService
        .sendWelcomeEmail(email, name)
        .catch((err) => console.error("⚠️ Failed to send welcome email:", err));

      // ------------------------------------------------------------
      // Success
      // ------------------------------------------------------------
      return c.json({
        user: {
          id: userId,
          email,
          name,
          displayName: name,
        },
      });
    } catch (error) {
      console.error("❌ Sign up exception:", error);
      return c.json({ error: "Sign up failed" }, 500);
    }
  });

  app.get("/auth/user-profile", async (c) => {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.text("Missing access token", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.error("Auth error in user-profile:", authError);
      return c.text("Unauthorized", 401);
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "display_name, avatar_url, decks_public, subscription_tier, user_role, user_role_verified, verified_at, subscription_expiry, email_notifications_enabled, email_offers, email_comment_replies, email_friend_requests, email_flag_notifications, email_moderation_updates"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Database error fetching user profile:", error);
        return c.text("Failed to fetch user profile", 500);
      }

      return c.json(data);
    } catch (error) {
      console.error("Error in user-profile endpoint:", error);
      return c.text("Internal server error", 500);
    }
  });

  // Set display name for OAuth users
  app.post("/auth/set-display-name", async (c) => {
    try {
      const authHeader = c.req.header("Authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        return c.json({ error: "No authorization token provided" }, 401);
      }

      // Verify the user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("Auth error in set-display-name:", authError);
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { displayName } = await c.req.json();

      if (!displayName || typeof displayName !== "string") {
        return c.json({ error: "Display name is required" }, 400);
      }

      const trimmedName = displayName.trim();

      if (trimmedName.length < 2 || trimmedName.length > 30) {
        return c.json(
          { error: "Display name must be between 2 and 30 characters" },
          400
        );
      }

      // Update the users table
      const { error: updateError } = await supabase
        .from("users")
        .update({ display_name: trimmedName })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update display name:", updateError);
        return c.json({ error: "Failed to update display name" }, 500);
      }

      // ✅ SEND WELCOME EMAIL FOR OAUTH USERS
      if (user.email) {
        emailService
          .sendWelcomeEmail(user.email, trimmedName)
          .catch((err) =>
            console.error("⚠️ Failed to send welcome email:", err)
          );
      }

      return c.json({ success: true, displayName: trimmedName });
    } catch (error) {
      console.error("Error in set-display-name endpoint:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
