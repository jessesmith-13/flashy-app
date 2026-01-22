import type { Hono, Context } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";

// Add a deck from community to your personal decks
export function registerCommunityAddDeckRoutes(app: Hono) {
  app.post("/community/add-deck", async (c: Context) => {
    try {
      const token = c.req.header("Authorization")?.split(" ")[1];
      if (!token) return c.json({ error: "Unauthorized" }, 401);

      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (!user) return c.json({ error: "Unauthorized" }, 401);

      const body = (await c.req.json()) as { communityDeckId?: string };
      const communityDeckId = body.communityDeckId;
      if (!communityDeckId) {
        return c.json({ error: "communityDeckId is required" }, 400);
      }

      const { data: communityDeck } = await supabase
        .from("community_decks")
        .select("*")
        .eq("id", communityDeckId)
        .eq("is_published", true)
        .single();

      if (!communityDeck) {
        return c.json({ error: "Community deck not found" }, 404);
      }

      // 🔧 CHECK: Do they own the original deck (not deleted)?
      const { data: ownsOriginal } = await supabase
        .from("decks")
        .select("id, is_deleted")
        .eq("id", communityDeck.original_deck_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownsOriginal && !ownsOriginal.is_deleted) {
        return c.json({ error: "You already own this deck" }, 400);
      }

      // 🔧 CHECK: Do they have an imported version (deleted or not)?
      const { data: importedDeck } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user.id)
        .eq("source_community_deck_id", communityDeckId)
        .maybeSingle();

      const now = new Date().toISOString();

      // 🔧 SCENARIO 1: Own deck that's deleted - Just undelete it
      if (ownsOriginal && ownsOriginal.is_deleted) {
        console.log(
          `🔄 User re-adding their own deleted deck ${ownsOriginal.id}`
        );

        // Undelete the cards (don't delete and recreate!)
        await supabase
          .from("cards")
          .update({
            is_deleted: false,
            deleted_at: null,
          })
          .eq("deck_id", ownsOriginal.id);

        // Undelete and update the deck
        await supabase
          .from("decks")
          .update({
            is_deleted: false,
            deleted_at: null,
            updated_at: now,
          })
          .eq("id", ownsOriginal.id);

        console.log(`✅ Restored deck ${ownsOriginal.id} and its cards`);
        return c.json({ restored: true, deckId: ownsOriginal.id });
      }

      // Need to fetch community cards for scenarios 2 & 3
      const { data: communityCards } = await supabase
        .from("community_cards")
        .select("*")
        .eq("community_deck_id", communityDeckId)
        .order("position");

      if (!communityCards || communityCards.length === 0) {
        return c.json({ error: "Community deck has no cards" }, 400);
      }

      // 🔧 SCENARIO 2: Imported deck exists (deleted or not) - Update it
      if (importedDeck) {
        // If it's deleted, we'll undelete it
        const isDeleted = importedDeck.is_deleted;

        // 🔧 TIMESTAMP-BASED CHECK (replaces version check)
        if (!isDeleted) {
          const communityUpdatedAt = new Date(
            communityDeck.source_content_updated_at || communityDeck.updated_at
          ).getTime();
          const lastSyncedAt = importedDeck.last_synced_at
            ? new Date(importedDeck.last_synced_at).getTime()
            : 0;

          console.log(
            `📊 Community deck last updated: ${new Date(
              communityUpdatedAt
            ).toISOString()}`
          );
          console.log(
            `📊 Imported deck last synced: ${
              importedDeck.last_synced_at
                ? new Date(lastSyncedAt).toISOString()
                : "never"
            }`
          );

          if (lastSyncedAt >= communityUpdatedAt) {
            console.log(`⚠️ User already has the latest version`);
            return c.json(
              { error: "You already have the latest version" },
              400
            );
          }
        }

        console.log(
          isDeleted
            ? `🔄 Restoring deleted imported deck ${importedDeck.id}`
            : `📥 Updating imported deck ${importedDeck.id}`
        );

        // Hard delete old cards (imported decks get fresh cards)
        await supabase.from("cards").delete().eq("deck_id", importedDeck.id);

        console.log(
          "IMPORTING COMMUNITY CARDS STARTING WITH (correct answers): ",
          communityCards[0].correct_answers
        );
        console.log(
          "IMPORTING COMMUNITY CARDS STARTING WITH (incorrect answers): ",
          communityCards[0].incorrect_answers
        );
        console.log(
          "IMPORTING COMMUNITY CARDS STARTING WITH: ",
          communityCards[0]
        );
        // Insert new cards
        await supabase.from("cards").insert(
          communityCards.map((c, i) => ({
            id: crypto.randomUUID(),
            deck_id: importedDeck.id,
            front: c.front,
            back: c.back,
            card_type: c.card_type,
            correct_answers: c.correct_answers,
            incorrect_answers: c.incorrect_answers,
            accepted_answers: c.accepted_answers,
            front_image_url: c.front_image_url,
            back_image_url: c.back_image_url,
            front_audio: c.front_audio,
            back_audio: c.back_audio,
            position: i,
            created_at: now,
          }))
        );

        // 🔧 Update deck (and undelete if needed) + store last_synced_at
        await supabase
          .from("decks")
          .update({
            name: communityDeck.name,
            emoji: communityDeck.emoji,
            color: communityDeck.color,
            category: communityDeck.category,
            subtopic: communityDeck.subtopic,
            difficulty: communityDeck.difficulty,
            card_count: communityCards.length,
            imported_from_version: communityDeck.version, // Keep for backwards compat
            last_synced_at:
              communityDeck.source_content_updated_at ||
              communityDeck.updated_at, // 🔧 Store sync timestamp
            is_deleted: false,
            deleted_at: null,
            updated_at: now,
          })
          .eq("id", importedDeck.id);

        console.log(
          `✅ ${isDeleted ? "Restored" : "Updated"} imported deck ${
            importedDeck.id
          }`
        );
        return c.json({
          updated: !isDeleted,
          restored: isDeleted,
          deckId: importedDeck.id,
        });
      }

      // 🔧 SCENARIO 3: First time importing - Create new
      console.log(
        `📥 Creating new imported deck from community deck ${communityDeckId}`
      );

      const newDeckId = crypto.randomUUID();

      const { error } = await supabase.from("decks").insert({
        id: newDeckId,
        user_id: user.id,
        creator_id: communityDeck.owner_id,
        name: communityDeck.name,
        emoji: communityDeck.emoji,
        color: communityDeck.color,
        category: communityDeck.category,
        subtopic: communityDeck.subtopic,
        difficulty: communityDeck.difficulty,
        card_count: communityCards.length,
        is_community: true,
        is_published: false,
        source_community_deck_id: communityDeckId,
        imported_from_version: communityDeck.version, // Keep for backwards compat
        last_synced_at:
          communityDeck.source_content_updated_at || communityDeck.updated_at, // 🔧 Store sync timestamp
        is_deleted: false,
        created_at: now,
      });

      if (error) {
        console.log(`❌ Failed to create imported deck: ${error.message}`);
        return c.json({ error: error.message }, 500);
      }

      await supabase.from("cards").insert(
        communityCards.map((c, i) => ({
          id: crypto.randomUUID(),
          deck_id: newDeckId,
          front: c.front,
          back: c.back,
          card_type: c.card_type,
          correct_answers: c.correct_answers,
          incorrect_answers: c.incorrect_answers,
          accepted_answers: c.accepted_answers,
          front_image_url: c.front_image_url,
          back_image_url: c.back_image_url,
          front_audio: c.front_audio,
          back_audio: c.back_audio,
          position: i,
          created_at: now,
        }))
      );

      // Increment download count
      await supabase
        .from("community_decks")
        .update({ download_count: (communityDeck.download_count ?? 0) + 1 })
        .eq("id", communityDeckId);

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING - IMPORTER ACHIEVEMENTS
      // ============================================================

      try {
        // Check if this is the user's first import
        const { count: importedCount, error: countError } = await supabase
          .from("decks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_community", true);

        if (countError) {
          console.log(
            `⚠️ Error counting imported decks: ${countError.message}`
          );
        } else {
          console.log(
            `📊 User ${user.id} has imported ${importedCount || 0} deck(s)`
          );

          // Get current achievements for the IMPORTER
          const { data: currentAchievements, error: achievementError } =
            await supabase
              .from("user_achievements")
              .select("unlocked_achievement_ids")
              .eq("user_id", user.id)
              .single();

          if (achievementError && achievementError.code !== "PGRST116") {
            console.log(
              `⚠️ Error fetching achievements: ${achievementError.message}`
            );
          } else {
            const currentUnlocked =
              currentAchievements?.unlocked_achievement_ids || [];

            // Check COMMUNITY EXPLORER achievement (first import)
            if (
              (importedCount || 0) >= 1 &&
              !currentUnlocked.includes("community-explorer")
            ) {
              const { error: upsertError } = await supabase
                .from("user_achievements")
                .upsert(
                  {
                    user_id: user.id,
                    unlocked_achievement_ids: [
                      ...currentUnlocked,
                      "community-explorer",
                    ],
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id" }
                );

              if (upsertError) {
                console.log(
                  `❌ Error upserting achievements: ${upsertError.message}`
                );
              } else {
                console.log(`🎉 User ${user.id} unlocked: community-explorer`);
              }
            }
          }
        }
      } catch (achievementTrackingError) {
        console.log(
          `❌ Achievement tracking error: ${achievementTrackingError}`
        );
      }

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING - DECK OWNER ACHIEVEMENTS
      // ============================================================

      try {
        const newDownloadCount = (communityDeck.download_count ?? 0) + 1;
        const ownerId = communityDeck.owner_id;

        console.log(
          `📊 Deck ${communityDeckId} now has ${newDownloadCount} download(s)`
        );

        // Get owner's current achievements
        const { data: ownerAchievements, error: achievementError } =
          await supabase
            .from("user_achievements")
            .select("unlocked_achievement_ids")
            .eq("user_id", ownerId)
            .single();

        if (achievementError && achievementError.code !== "PGRST116") {
          console.log(
            `⚠️ Error fetching owner achievements: ${achievementError.message}`
          );
        } else {
          const currentUnlocked =
            ownerAchievements?.unlocked_achievement_ids || [];
          const newlyUnlocked: string[] = [];

          // Check VIRAL DECK achievement (100 downloads on THIS deck)
          if (
            newDownloadCount >= 100 &&
            !currentUnlocked.includes("viral-deck")
          ) {
            newlyUnlocked.push("viral-deck");
            console.log(`🎉 Deck ${communityDeckId} reached 100 downloads!`);
          }

          // Check POPULAR CREATOR achievement (50 total downloads across ALL owner's decks)
          const { data: ownerDecks } = await supabase
            .from("community_decks")
            .select("download_count")
            .eq("owner_id", ownerId)
            .eq("is_published", true);

          if (ownerDecks && ownerDecks.length > 0) {
            const totalDownloads = ownerDecks.reduce(
              (sum, deck) => sum + (deck.download_count ?? 0),
              0
            );

            console.log(
              `📊 Owner ${ownerId} has ${totalDownloads} total download(s) across ${ownerDecks.length} deck(s)`
            );

            if (
              totalDownloads >= 50 &&
              !currentUnlocked.includes("popular-creator")
            ) {
              newlyUnlocked.push("popular-creator");
              console.log(`🎉 Owner ${ownerId} reached 50 total downloads!`);
            }
          }

          // Update achievements if any unlocked
          if (newlyUnlocked.length > 0) {
            const { error: upsertError } = await supabase
              .from("user_achievements")
              .upsert(
                {
                  user_id: ownerId,
                  unlocked_achievement_ids: [
                    ...currentUnlocked,
                    ...newlyUnlocked,
                  ],
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
              );

            if (upsertError) {
              console.log(
                `❌ Error upserting achievements: ${upsertError.message}`
              );
            } else {
              console.log(
                `🎉 Owner ${ownerId} unlocked achievements: ${newlyUnlocked.join(
                  ", "
                )}`
              );
            }
          }
        }
      } catch (achievementTrackingError) {
        console.log(
          `❌ Achievement tracking error: ${achievementTrackingError}`
        );
      }

      console.log(`✅ Created new imported deck ${newDeckId}`);
      return c.json({ created: true, deckId: newDeckId });
    } catch (error) {
      console.error("❌ Add deck from community error:", error);
      return c.json({ error: "Failed to add deck from community" }, 500);
    }
  });
}
