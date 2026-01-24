import type { Hono } from "npm:hono@4";
import type { Context } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import { toCamelCase, toSnakeCase } from "../../lib/utils/case.ts";

export function registerPersonalDeckRoutes(app: Hono) {
  // Get all decks for authenticated user
  app.get("/decks", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];

      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        console.log(`❌ Auth error in get decks: ${authError?.message}`);
        return c.json({ error: "Unauthorized" }, 401);
      }

      console.log(`📚 Getting all decks for user ${user.id}`);

      // ============================================================
      // SQL VERSION: Query decks table
      // ============================================================
      const { data: decks, error: decksError } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (decksError) {
        console.log(`❌ Get decks error: ${decksError.message}`);
        return c.json({ error: "Failed to fetch decks" }, 500);
      }

      // Migration: Set creator_id for old decks that don't have it
      // This handles decks created before the creator_id field was added
      let migratedCount = 0;
      if (decks) {
        for (const deck of decks) {
          if (!deck.creator_id) {
            const { error: updateError } = await supabase
              .from("decks")
              .update({ creator_id: user.id })
              .eq("id", deck.id)
              .eq("user_id", user.id);

            if (!updateError) {
              deck.creator_id = user.id;
              migratedCount++;
            }
          }
        }
        if (migratedCount > 0) {
          console.log(`✅ Migrated ${migratedCount} decks to add creator_id`);
        }
      }

      console.log(`✅ Fetched ${decks?.length || 0} decks for user ${user.id}`);

      return c.json({ decks: toCamelCase(decks || []) });
    } catch (error) {
      console.log(`❌ Get decks exception: ${error}`);
      return c.json({ error: "Failed to fetch decks" }, 500);
    }
  });

  // Create a new deck
  app.post("/decks", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];

      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        console.log(`❌ Auth error in create deck: ${authError?.message}`);
        return c.json({ error: "Unauthorized" }, 401);
      }

      const {
        name,
        color,
        emoji,
        deckType,
        category,
        subtopic,
        difficulty,
        frontLanguage,
        backLanguage,
      } = await c.req.json();

      if (!name) {
        return c.json({ error: "Deck name is required" }, 400);
      }

      console.log(`📚 Creating new deck "${name}" for user ${user.id}`);

      // ============================================================
      // SQL VERSION: Get max position from existing decks
      // ============================================================
      const { data: existingDecks, error: getError } = await supabase
        .from("decks")
        .select("position")
        .eq("user_id", user.id)
        .order("position", { ascending: false })
        .limit(1);

      if (getError) {
        console.log(`⚠️  Error getting max position: ${getError.message}`);
      }

      const maxPosition =
        existingDecks && existingDecks.length > 0
          ? existingDecks[0].position || 0
          : -1;

      const deckId = crypto.randomUUID();

      // ============================================================
      // SQL VERSION: Insert new deck into decks table
      // ============================================================
      const deckData = {
        id: deckId,
        user_id: user.id,
        creator_id: user.id,
        name,
        color: color || "#10B981",
        emoji: emoji || "📚",
        deck_type: deckType || "classic-flip",
        category: category || null,
        subtopic: subtopic || null,
        difficulty: difficulty || null,
        front_language: frontLanguage || null,
        back_language: backLanguage || null,
        card_count: 0,
        position: maxPosition + 1,
        created_at: new Date().toISOString(),
      };

      const { data: deck, error: insertError } = await supabase
        .from("decks")
        .insert(deckData)
        .select()
        .single();

      if (insertError || !deck) {
        console.log(`❌ Create deck error: ${insertError?.message}`);
        return c.json({ error: "Failed to create deck" }, 500);
      }

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING
      // ============================================================

      // Get current achievements
      const { data: currentAchievements } = await supabase
        .from("user_achievements")
        .select(
          "unlocked_achievement_ids, decks_created, customized_deck_theme",
        )
        .eq("user_id", user.id)
        .single();

      const currentUnlocked =
        currentAchievements?.unlocked_achievement_ids || [];
      const newDecksCreated = (currentAchievements?.decks_created || 0) + 1;

      // Count unique categories across all user's decks (including the new one)
      const { data: userDecks } = await supabase
        .from("decks")
        .select("category")
        .eq("user_id", user.id)
        .not("category", "is", null);

      const uniqueCategories = new Set(userDecks?.map((d) => d.category) || []);
      if (category) uniqueCategories.add(category); // Add new deck's category
      const categoriesUsedCount = uniqueCategories.size;

      // Check for personalized achievement
      const isCustomized =
        (emoji && emoji !== "📚") || (color && color !== "#10B981");

      // Determine newly unlocked achievements
      const newlyUnlocked: string[] = [];

      if (isCustomized && !currentUnlocked.includes("personalized")) {
        newlyUnlocked.push("personalized");
      }

      // Deck count achievements
      if (newDecksCreated >= 5 && !currentUnlocked.includes("deck-builder")) {
        newlyUnlocked.push("deck-builder");
      }
      if (
        newDecksCreated >= 10 &&
        !currentUnlocked.includes("deck-architect")
      ) {
        newlyUnlocked.push("deck-architect");
      }
      if (newDecksCreated >= 20 && !currentUnlocked.includes("deck-master")) {
        newlyUnlocked.push("deck-master");
      }

      // Category variety achievement
      if (
        categoriesUsedCount >= 5 &&
        !currentUnlocked.includes("categorized")
      ) {
        newlyUnlocked.push("categorized");
      }

      // Update achievements in database
      const { data: upsertData, error: upsertError } = await supabase
        .from("user_achievements")
        .upsert(
          {
            user_id: user.id,
            decks_created: newDecksCreated,
            categories_used: categoriesUsedCount,
            customized_deck_theme:
              isCustomized ||
              currentAchievements?.customized_deck_theme ||
              false,
            unlocked_achievement_ids: [...currentUnlocked, ...newlyUnlocked],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select();

      console.log(`💾 Upsert result:`, upsertData);
      console.log(`❌ Upsert error:`, upsertError);

      if (newlyUnlocked.length > 0) {
        console.log(
          `🎉 User ${user.id} unlocked achievements: ${newlyUnlocked.join(", ")}`,
        );
      }

      console.log(
        `✅ Created deck ${deckId}: "${name}" at position ${maxPosition + 1}`,
      );
      console.log(
        `📊 Stats - Decks created: ${newDecksCreated}, Categories used: ${categoriesUsedCount}`,
      );

      return c.json({ deck: toCamelCase(deck) });
    } catch (error) {
      console.log(`❌ Create deck exception: ${error}`);
      return c.json({ error: "Failed to create deck" }, 500);
    }
  });

  // Update deck positions (for drag and drop reordering)
  // IMPORTANT: This must come BEFORE /decks/:deckId to avoid route conflicts
  app.put("/decks/positions", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];

      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        console.log(
          `❌ Auth error in update deck positions: ${authError?.message}`,
        );
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { positions } = await c.req.json();

      if (!Array.isArray(positions)) {
        return c.json({ error: "Invalid positions data" }, 400);
      }

      console.log(
        `🔄 Updating positions for ${positions.length} decks for user ${user.id}`,
      );

      // ============================================================
      // SQL VERSION: Update each deck's position
      // ============================================================
      let successCount = 0;
      let errorCount = 0;

      for (const { id, position } of positions) {
        const { error: updateError } = await supabase
          .from("decks")
          .update({ position })
          .eq("id", id)
          .eq("user_id", user.id); // Security: Only update user's own decks

        if (updateError) {
          console.log(`⚠️  Error updating deck ${id}: ${updateError.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      }

      console.log(
        `✅ Updated ${successCount} deck positions (${errorCount} errors)`,
      );

      return c.json({
        success: true,
        updated: successCount,
        errors: errorCount,
      });
    } catch (error) {
      console.log(`❌ Update deck positions exception: ${error}`);
      return c.json({ error: "Failed to update deck positions" }, 500);
    }
  });

  // Update a deck
  app.put("/decks/:deckId", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];

      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        console.log(`❌ Auth error in update deck: ${authError?.message}`);
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");
      const updates = await c.req.json();

      console.log(`✏️  Updating deck ${deckId} for user ${user.id}`);

      // ============================================================
      // SQL VERSION: Update deck and return updated data
      // ============================================================

      // Convert camelCase updates to snake_case for database
      const snakeCaseUpdates = toSnakeCase(updates);

      // Remove fields that shouldn't be updated via this endpoint
      delete snakeCaseUpdates.id;
      delete snakeCaseUpdates.user_id;
      delete snakeCaseUpdates.creator_id;
      delete snakeCaseUpdates.created_at;

      const { data: updatedDeck, error: updateError } = await supabase
        .from("decks")
        .update(snakeCaseUpdates)
        .eq("id", deckId)
        .eq("user_id", user.id) // Security: Only update user's own decks
        .select()
        .single();

      if (updateError) {
        console.log(`❌ Update deck error: ${updateError.message}`);
        if (updateError.code === "PGRST116") {
          return c.json({ error: "Deck not found" }, 404);
        }
        return c.json({ error: "Failed to update deck" }, 500);
      }

      if (!updatedDeck) {
        return c.json({ error: "Deck not found" }, 404);
      }

      console.log(
        `✅ Updated deck ${deckId}: ${Object.keys(updates).join(", ")}`,
      );

      // ✅ CHECK FOR PERSONALIZED ACHIEVEMENT (BOTH endpoints)
      const isCustomized =
        updates.emoji !== "📚" || updates.color !== "#10B981";

      if (isCustomized) {
        // First, get current achievements
        const { data: currentAchievements } = await supabase
          .from("user_achievements")
          .select("unlocked_achievement_ids")
          .eq("user_id", user.id)
          .single();

        const currentUnlocked =
          currentAchievements?.unlocked_achievement_ids || [];

        // Only update if not already unlocked
        if (!currentUnlocked.includes("personalized")) {
          await supabase.from("user_achievements").upsert(
            {
              user_id: user.id,
              customized_deck_theme: true,
              unlocked_achievement_ids: [...currentUnlocked, "personalized"],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

          console.log(
            `🎉 User ${user.id} unlocked "Personalized" achievement!`,
          );
        }
      }

      return c.json({ deck: toCamelCase(updatedDeck) });
    } catch (error) {
      console.log(`❌ Update deck exception: ${error}`);
      return c.json({ error: "Failed to update deck" }, 500);
    }
  });

  // Delete a personal deck (soft delete - sets is_deleted = true)
  app.delete("/decks/:deckId", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];

      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        console.log(
          `❌ Auth error in delete personal deck: ${authError?.message}`,
        );
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");

      console.log(`🗑️ User ${user.id} deleting personal deck ${deckId}`);

      // Verify deck exists and user owns it
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .select("id, name")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .eq("is_deleted", false) // Can't delete already deleted decks
        .single();

      if (deckError || !deck) {
        console.log(`❌ Deck not found or unauthorized: ${deckError?.message}`);
        return c.json({ error: "Deck not found or already deleted" }, 404);
      }

      const now = new Date().toISOString();

      // 🔧 FIRST: Soft delete the cards
      const { error: cardsDeleteError } = await supabase
        .from("cards")
        .update({
          is_deleted: true,
          deleted_at: now,
        })
        .eq("deck_id", deckId);

      if (cardsDeleteError) {
        console.log(
          `❌ Failed to soft delete cards: ${cardsDeleteError.message}`,
        );
        return c.json({ error: "Failed to delete deck cards" }, 500);
      }

      // 🔧 THEN: Soft delete the deck
      const { error: deleteError } = await supabase
        .from("decks")
        .update({
          is_deleted: true,
          deleted_at: now,
        })
        .eq("id", deckId)
        .eq("user_id", user.id); // Security: Double-check ownership

      if (deleteError) {
        console.log(`❌ Failed to delete deck: ${deleteError.message}`);
        return c.json({ error: "Failed to delete deck" }, 500);
      }

      console.log(
        `✅ Soft deleted personal deck ${deckId} (${deck.name}) and its cards`,
      );

      return c.json({ success: true });
    } catch (error) {
      console.log(`❌ Delete personal deck exception: ${error}`);
      return c.json({ error: "Failed to delete deck" }, 500);
    }
  });
}
