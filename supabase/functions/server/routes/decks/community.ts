import type { Hono } from "npm:hono@4";
import type { Context } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import { toCamelCase } from "../../lib/utils/case.ts";

export function registerCommunityDeckRoutes(app: Hono) {
  // Update an imported deck from community
  app.put("/decks/:deckId/update-from-community", async (c: Context) => {
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
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");

      // ------------------------------------------------------------
      // Fetch personal deck
      // ------------------------------------------------------------
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .single();

      if (deckError || !deck) {
        return c.json({ error: "Deck not found" }, 404);
      }

      if (!deck.source_community_deck_id) {
        return c.json({ error: "Deck is not imported from community" }, 400);
      }

      // Prevent updating your own published deck
      if (deck.creator_id === user.id) {
        return c.json(
          { error: "You cannot update your own deck from community" },
          400,
        );
      }

      // ------------------------------------------------------------
      // Fetch community deck
      // ------------------------------------------------------------
      const { data: communityDeck, error: communityError } = await supabase
        .from("community_decks")
        .select("*")
        .eq("id", deck.source_community_deck_id)
        .eq("is_published", true)
        .single();

      if (communityError || !communityDeck) {
        return c.json(
          { error: "Community deck no longer exists or is unpublished" },
          404,
        );
      }

      // ------------------------------------------------------------
      // 🔧 TIMESTAMP-BASED FRESHNESS CHECK (replaces version check)
      // ------------------------------------------------------------
      const communityUpdatedAt = new Date(
        communityDeck.source_content_updated_at || communityDeck.updated_at,
      ).getTime();
      const lastSyncedAt = deck.last_synced_at
        ? new Date(deck.last_synced_at).getTime()
        : 0;

      console.log(
        `📊 Community deck last updated: ${new Date(
          communityUpdatedAt,
        ).toISOString()}`,
      );
      console.log(
        `📊 Personal deck last synced: ${
          deck.last_synced_at ? new Date(lastSyncedAt).toISOString() : "never"
        }`,
      );

      if (lastSyncedAt >= communityUpdatedAt) {
        console.log(`⚠️ Deck is already up to date`);
        return c.json({ error: "Deck is already up to date" }, 400);
      }

      // ------------------------------------------------------------
      // Fetch community cards (SOURCE OF TRUTH)
      // ------------------------------------------------------------
      const { data: communityCards, error: cardsError } = await supabase
        .from("community_cards")
        .select("*")
        .eq("community_deck_id", communityDeck.id)
        .order("position", { ascending: true });

      if (cardsError || !communityCards || communityCards.length === 0) {
        return c.json({ error: "Community deck has no cards" }, 400);
      }

      const now = new Date().toISOString();

      // ------------------------------------------------------------
      // Replace cards atomically
      // ------------------------------------------------------------
      await supabase.from("cards").delete().eq("deck_id", deck.id);

      const newCards = communityCards.map((card, index) => ({
        deck_id: deck.id,
        front: card.front,
        back: card.back,
        card_type: card.card_type,
        correct_answers: card.correct_answers,
        incorrect_answers: card.incorrect_answers,
        accepted_answers: card.accepted_answers,
        front_image_url: card.front_image_url,
        back_image_url: card.back_image_url,
        front_audio: card.front_audio,
        back_audio: card.back_audio,
        position: index,
        created_at: now,
      }));

      console.log(`🔄 Inserting ${newCards.length} updated cards`);

      const { error: insertError } = await supabase
        .from("cards")
        .insert(newCards);

      if (insertError) {
        console.log("❌ Card insert error:", insertError);
        return c.json({ error: "Failed to insert updated cards" }, 500);
      }

      const { count: actualCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", deck.id);

      const deckCardCount = actualCount ?? 0;

      // ------------------------------------------------------------
      // 🔧 Update deck metadata + last_synced_at timestamp
      // ------------------------------------------------------------
      const { data: updatedDeck, error: updateError } = await supabase
        .from("decks")
        .update({
          name: communityDeck.name,
          emoji: communityDeck.emoji,
          color: communityDeck.color,
          category: communityDeck.category,
          subtopic: communityDeck.subtopic,
          difficulty: communityDeck.difficulty,
          card_count: deckCardCount,
          content_updated_at: communityDeck.source_content_updated_at,
          updated_at: now,
          last_synced_at:
            communityDeck.source_content_updated_at || communityDeck.updated_at, // 🔧 Store sync timestamp
          imported_from_version: communityDeck.version, // Keep for backwards compat
        })
        .eq("id", deck.id)
        .select()
        .single();

      if (updateError) {
        console.log("❌ Deck update error:", updateError);
        return c.json({ error: "Failed to update deck metadata" }, 500);
      }

      console.log(`✅ Successfully updated deck ${deck.id} from community`);

      return c.json({
        deck: toCamelCase(updatedDeck),
        updated: true,
      });
    } catch (error) {
      console.error("❌ Update imported deck exception:", error);
      return c.json({ error: "Failed to update imported deck" }, 500);
    }
  });

  // Publish a deck to the community (first publish OR re-publish)
  app.post("/decks/:deckId/publish", async (c: Context) => {
    try {
      // ============================================================
      // Auth
      // ============================================================
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");
      const { category, subtopic } = await c.req.json();

      if (!category || !subtopic) {
        return c.json({ error: "Category and subtopic are required" }, 400);
      }

      console.log(`📤 Publishing deck ${deckId} for user ${user.id}`);

      // ============================================================
      // Fetch source deck (must belong to user)
      // ============================================================
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .single();

      if (deckError || !deck) {
        console.log(`❌ Deck not found: ${deckError?.message}`);
        return c.json({ error: "Deck not found" }, 404);
      }

      if (deck.publish_banned) {
        return c.json(
          {
            error: "This deck is banned from publishing",
            reason: deck.publish_banned_reason || null,
          },
          403,
        );
      }

      if (deck.is_community) {
        console.log(`❌ Cannot publish a community deck`);
        return c.json(
          { error: "Cannot publish a deck that was imported from community" },
          403,
        );
      }

      const now = new Date().toISOString();

      // ============================================================
      // Check for existing community deck
      // ============================================================
      const { data: existingCommunityDeck } = await supabase
        .from("community_decks")
        .select("*")
        .eq("original_deck_id", deckId)
        .maybeSingle();

      // ============================================================
      // Fetch cards from source deck
      // ============================================================
      const { data: cards, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("position", { ascending: true });

      if (cardsError) {
        console.log(`❌ Error fetching cards: ${cardsError.message}`);
        return c.json({ error: "Failed to fetch cards" }, 500);
      }

      if (!cards || cards.length === 0) {
        console.log(`❌ No cards found for deck ${deckId}`);
        return c.json(
          { error: "Deck must have at least one card to publish" },
          400,
        );
      }

      console.log(`✅ Found ${cards.length} cards to publish`);

      // ============================================================
      // Get owner display name
      // ============================================================
      const { data: userProfile } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single();

      const ownerDisplayName =
        userProfile?.display_name ||
        user.user_metadata?.displayName ||
        user.user_metadata?.name ||
        "Unknown";

      // ============================================================
      // CASE 1: Update already-published deck
      // ============================================================
      if (existingCommunityDeck?.is_published) {
        console.log(
          `🔄 Updating already-published community deck ${existingCommunityDeck.id}`,
        );

        // 🔧 Check if there are actual changes to publish
        const sourceUpdatedAt = new Date(deck.updated_at).getTime();
        const communityUpdatedAt = new Date(
          existingCommunityDeck.source_content_updated_at ||
            existingCommunityDeck.updated_at,
        ).getTime();

        console.log(
          `📊 Source deck last updated: ${new Date(
            sourceUpdatedAt,
          ).toISOString()}`,
        );
        console.log(
          `📊 Community deck last synced: ${new Date(
            communityUpdatedAt,
          ).toISOString()}`,
        );

        if (sourceUpdatedAt <= communityUpdatedAt) {
          console.log(
            `⚠️ No changes detected - source deck hasn't been updated since last publish`,
          );
          return c.json(
            {
              error:
                "No changes detected. Make edits to the deck to publish an update.",
            },
            400,
          );
        }

        console.log(`✅ Changes detected - proceeding with update`);

        // Update metadata + version
        const { error: updateError } = await supabase
          .from("community_decks")
          .update({
            owner_id: user.id,
            updated_at: now,
            category,
            subtopic,
            name: deck.name,
            emoji: deck.emoji,
            color: deck.color,
            difficulty: deck.difficulty,
            front_language: deck.front_language,
            back_language: deck.back_language,
            card_count: cards.length,
            source_content_updated_at: deck.updated_at, // ✅ Store BEFORE updating source deck
            // version handled by trigger
          })
          .eq("id", existingCommunityDeck.id);

        if (updateError) {
          console.log(
            `❌ Error updating community deck: ${updateError.message}`,
          );
          return c.json({ error: "Failed to update community deck" }, 500);
        }

        // Replace cards
        const { error: deleteError } = await supabase
          .from("community_cards")
          .delete()
          .eq("community_deck_id", existingCommunityDeck.id);

        if (deleteError) {
          console.log(`❌ Error deleting old cards: ${deleteError.message}`);
          return c.json({ error: "Failed to delete old cards" }, 500);
        }

        console.log(
          `🗑️ Deleted old cards, inserting ${cards.length} new cards`,
        );

        const communityCards = cards.map((card) => ({
          community_deck_id: existingCommunityDeck.id,
          front: card.front,
          back: card.back,
          card_type: card.card_type,
          correct_answers: card.correct_answers || null,
          incorrect_answers: card.incorrect_answers || null,
          accepted_answers: card.accepted_answers,
          front_image_url: card.front_image_url,
          back_image_url: card.back_image_url,
          audio_url: card.front_audio || card.back_audio || null,
          position: card.position,
          created_at: now,
          updated_at: now,
        }));

        const { error: insertCardsError } = await supabase
          .from("community_cards")
          .insert(communityCards);

        if (insertCardsError) {
          console.log(`❌ Error inserting cards: ${insertCardsError.message}`);
          return c.json(
            { error: `Failed to insert cards: ${insertCardsError.message}` },
            500,
          );
        }

        console.log(`✅ Successfully updated ${cards.length} cards`);

        // 🔧 FIX: Only update source deck if category/subtopic changed
        // This prevents unnecessary updated_at changes that trigger false "changes detected"
        const needsMetadataUpdate =
          deck.category !== category ||
          deck.subtopic !== subtopic ||
          !deck.is_published;

        if (needsMetadataUpdate) {
          console.log(
            `📝 Updating source deck metadata (category/subtopic/published status changed)`,
          );
          await supabase
            .from("decks")
            .update({
              is_published: true,
              category,
              subtopic,
            })
            .eq("id", deckId);
        } else {
          console.log(
            `⏭️ Skipping source deck metadata update - no changes needed`,
          );
        }

        console.log(`✅ Updated published deck ${deckId}`);

        // No achievement tracking for updates - only for new publishes
        return c.json({
          updated: true,
          deck: {
            id: existingCommunityDeck.id,
            version: (existingCommunityDeck.version || 0) + 1,
          },
          achievementsUnlocked: [], // ✅ Always empty for updates
        });
      }

      // ============================================================
      // CASE 2: Re-publish previously unpublished deck
      // ============================================================
      if (existingCommunityDeck && !existingCommunityDeck.is_published) {
        console.log(
          `🔄 Re-publishing existing community deck ${existingCommunityDeck.id}`,
        );

        // Update metadata + republish
        const { error: updateError } = await supabase
          .from("community_decks")
          .update({
            is_published: true,
            published_at: now,
            updated_at: now,
            category,
            subtopic,
            name: deck.name,
            emoji: deck.emoji,
            color: deck.color,
            difficulty: deck.difficulty,
            front_language: deck.front_language,
            back_language: deck.back_language,
            card_count: cards.length,
            source_content_updated_at: deck.updated_at, // ✅ Store BEFORE updating source deck
            // version handled by trigger
          })
          .eq("id", existingCommunityDeck.id);

        if (updateError) {
          console.log(
            `❌ Error updating community deck: ${updateError.message}`,
          );
          return c.json({ error: "Failed to update community deck" }, 500);
        }

        // Replace cards safely
        const { error: deleteError } = await supabase
          .from("community_cards")
          .delete()
          .eq("community_deck_id", existingCommunityDeck.id);

        if (deleteError) {
          console.log(`❌ Error deleting old cards: ${deleteError.message}`);
          return c.json({ error: "Failed to delete old cards" }, 500);
        }

        console.log(
          `🗑️ Deleted old cards, inserting ${cards.length} new cards`,
        );

        const communityCards = cards.map((card) => ({
          community_deck_id: existingCommunityDeck.id,
          front: card.front,
          back: card.back,
          card_type: card.card_type,
          correct_answers: card.correct_answers,
          incorrect_answers: card.incorrect_answers || null,
          accepted_answers: card.accepted_answers || null,
          front_image_url: card.front_image_url,
          back_image_url: card.back_image_url,
          audio_url: card.front_audio || card.back_audio || null,
          position: card.position,
          created_at: now,
          updated_at: now,
        }));

        const { error: insertCardsError } = await supabase
          .from("community_cards")
          .insert(communityCards);

        if (insertCardsError) {
          console.log(`❌ Error inserting cards: ${insertCardsError.message}`);
          return c.json(
            { error: `Failed to insert cards: ${insertCardsError.message}` },
            500,
          );
        }

        console.log(`✅ Successfully inserted ${cards.length} cards`);

        // 🔧 FIX: Only update source deck if category/subtopic changed
        const needsMetadataUpdate =
          deck.category !== category ||
          deck.subtopic !== subtopic ||
          !deck.is_published;

        if (needsMetadataUpdate) {
          console.log(
            `📝 Updating source deck metadata (category/subtopic/published status changed)`,
          );
          await supabase
            .from("decks")
            .update({
              is_published: true,
              category,
              subtopic,
            })
            .eq("id", deckId);
        } else {
          console.log(
            `⏭️ Skipping source deck metadata update - no changes needed`,
          );
        }

        console.log(`✅ Re-published deck ${deckId}`);

        // ============================================================
        // 🎯 ACHIEVEMENT TRACKING - PUBLISHING ACHIEVEMENTS
        // ============================================================
        let achievementsUnlocked: string[] = [];

        try {
          // Count total published community decks by this user
          const { count: publishedCount, error: countError } = await supabase
            .from("community_decks")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", user.id)
            .eq("is_published", true);

          if (countError) {
            console.log(
              `⚠️ Error counting published decks: ${countError.message}`,
            );
          } else {
            console.log(
              `📊 User ${user.id} now has ${
                publishedCount || 0
              } published deck(s)`,
            );

            // Get current achievements
            const { data: currentAchievements, error: achievementError } =
              await supabase
                .from("user_achievements")
                .select("unlocked_achievement_ids")
                .eq("user_id", user.id)
                .single();

            if (achievementError && achievementError.code !== "PGRST116") {
              console.log(
                `⚠️ Error fetching achievements: ${achievementError.message}`,
              );
            } else {
              const currentUnlocked =
                currentAchievements?.unlocked_achievement_ids || [];
              const newlyUnlocked: string[] = [];

              // Check publishing achievements
              if (
                (publishedCount || 0) >= 1 &&
                !currentUnlocked.includes("publisher")
              ) {
                newlyUnlocked.push("publisher"); // First publish
              }
              if (
                (publishedCount || 0) >= 5 &&
                !currentUnlocked.includes("prolific-publisher")
              ) {
                newlyUnlocked.push("prolific-publisher"); // 5 publishes
              }

              // Update achievements if any unlocked
              if (newlyUnlocked.length > 0) {
                const { error: upsertError } = await supabase
                  .from("user_achievements")
                  .upsert(
                    {
                      user_id: user.id,
                      unlocked_achievement_ids: [
                        ...currentUnlocked,
                        ...newlyUnlocked,
                      ],
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" },
                  );

                if (upsertError) {
                  console.log(
                    `❌ Error upserting achievements: ${upsertError.message}`,
                  );
                } else {
                  console.log(
                    `🎉 User ${
                      user.id
                    } unlocked achievements: ${newlyUnlocked.join(", ")}`,
                  );
                  achievementsUnlocked = newlyUnlocked;
                }
              }
            }
          }
        } catch (achievementTrackingError) {
          console.log(
            `❌ Achievement tracking error: ${achievementTrackingError}`,
          );
        }

        return c.json({
          republished: true,
          deck: {
            id: existingCommunityDeck.id,
            version: existingCommunityDeck.version || 1,
          },
          achievementsUnlocked, // ✅ Return unlocked achievements
        });
      }

      // ============================================================
      // CASE 3: First-time publish
      // ============================================================
      console.log(`🆕 First-time publish for deck ${deckId}`);

      const { data: communityDeck, error: insertDeckError } = await supabase
        .from("community_decks")
        .insert({
          original_deck_id: deckId,
          owner_id: user.id,
          owner_display_name: ownerDisplayName,
          name: deck.name,
          emoji: deck.emoji,
          color: deck.color,
          category,
          subtopic,
          difficulty: deck.difficulty,
          front_language: deck.front_language,
          back_language: deck.back_language,
          card_count: cards.length,
          version: 1,
          is_published: true,
          created_at: now,
          updated_at: now,
          published_at: now,
          source_content_updated_at: deck.updated_at,
        })
        .select()
        .single();

      if (insertDeckError) {
        console.log(
          `❌ Error inserting community deck: ${insertDeckError.message}`,
        );
        return c.json({ error: "Failed to publish deck" }, 500);
      }

      console.log(`✅ Created community deck ${communityDeck.id}`);
      console.log(`📦 Preparing ${cards.length} cards for insert`);

      const communityCards = cards.map((card, index) => {
        // Map the card fields correctly based on card type
        const mappedCard: any = {
          community_deck_id: communityDeck.id,
          front: card.front,
          back: card.back,
          card_type: card.card_type,
          accepted_answers: card.accepted_answers,
          front_image_url: card.front_image_url,
          back_image_url: card.back_image_url,
          audio_url: card.front_audio || card.back_audio || null,
          position: card.position ?? index,
          created_at: now,
          updated_at: now,
        };

        // 🔧 For multiple-choice cards, extract from options (as arrays!)
        if (card.card_type === "multiple-choice") {
          mappedCard.correct_answers = card.correct_answers || null;
          mappedCard.incorrect_answers = card.incorrect_answers || null;
        } else {
          mappedCard.correct_answers = null;
          mappedCard.incorrect_answers = null;
        }

        return mappedCard;
      });

      console.log(
        `📦 First card sample:`,
        JSON.stringify(communityCards[0], null, 2),
      );

      const { error: insertCardsError } = await supabase
        .from("community_cards")
        .insert(communityCards);

      if (insertCardsError) {
        console.log(`❌ Error inserting cards: ${insertCardsError.message}`);
        console.log(
          `❌ Error details:`,
          JSON.stringify(insertCardsError, null, 2),
        );

        // Clean up the community deck since cards failed
        await supabase
          .from("community_decks")
          .delete()
          .eq("id", communityDeck.id);

        return c.json(
          { error: `Failed to insert cards: ${insertCardsError.message}` },
          500,
        );
      }

      console.log(`✅ Successfully inserted ${cards.length} cards`);

      // Mark source deck as published (always needed for first-time publish)
      const { error: markPublishedError } = await supabase
        .from("decks")
        .update({
          is_published: true,
          category,
          subtopic,
        })
        .eq("id", deckId);

      if (markPublishedError) {
        console.log(
          `⚠️ Warning: Failed to mark source deck as published: ${markPublishedError.message}`,
        );
      }

      console.log(
        `✅ Successfully published deck ${deckId} as community deck ${communityDeck.id}`,
      );

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING - PUBLISHING ACHIEVEMENTS
      // ============================================================
      let achievementsUnlocked: string[] = [];

      try {
        // Count total published community decks by this user
        const { count: publishedCount, error: countError } = await supabase
          .from("community_decks")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("is_published", true);

        if (countError) {
          console.log(
            `⚠️ Error counting published decks: ${countError.message}`,
          );
        } else {
          console.log(
            `📊 User ${user.id} now has ${
              publishedCount || 0
            } published deck(s)`,
          );

          // Get current achievements
          const { data: currentAchievements, error: achievementError } =
            await supabase
              .from("user_achievements")
              .select("unlocked_achievement_ids")
              .eq("user_id", user.id)
              .single();

          if (achievementError && achievementError.code !== "PGRST116") {
            console.log(
              `⚠️ Error fetching achievements: ${achievementError.message}`,
            );
          } else {
            const currentUnlocked =
              currentAchievements?.unlocked_achievement_ids || [];
            const newlyUnlocked: string[] = [];

            // Check publishing achievements
            if (
              (publishedCount || 0) >= 1 &&
              !currentUnlocked.includes("publisher")
            ) {
              newlyUnlocked.push("publisher"); // First publish
            }
            if (
              (publishedCount || 0) >= 5 &&
              !currentUnlocked.includes("prolific-publisher")
            ) {
              newlyUnlocked.push("prolific-publisher"); // 5 publishes
            }

            // Update achievements if any unlocked
            if (newlyUnlocked.length > 0) {
              const { error: upsertError } = await supabase
                .from("user_achievements")
                .upsert(
                  {
                    user_id: user.id,
                    unlocked_achievement_ids: [
                      ...currentUnlocked,
                      ...newlyUnlocked,
                    ],
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id" },
                );

              if (upsertError) {
                console.log(
                  `❌ Error upserting achievements: ${upsertError.message}`,
                );
              } else {
                console.log(
                  `🎉 User ${
                    user.id
                  } unlocked achievements: ${newlyUnlocked.join(", ")}`,
                );
                achievementsUnlocked = newlyUnlocked;
              }
            }
          }
        }
      } catch (achievementTrackingError) {
        console.log(
          `❌ Achievement tracking error: ${achievementTrackingError}`,
        );
      }

      return c.json({
        published: true,
        deck: communityDeck,
        achievementsUnlocked, // ✅ Return unlocked achievements
      });
    } catch (error) {
      console.error("❌ Publish deck exception:", error);
      return c.json({ error: "Failed to publish deck" }, 500);
    }
  });

  // Unpublish a deck from community
  app.post("/decks/:deckId/unpublish", async (c: Context) => {
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
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId"); // ✅ Now the original deck ID

      // ✅ Check if user is superuser via database (NO METADATA!)
      const { data: userProfile } = await supabase
        .from("users")
        .select("is_superuser")
        .eq("id", user.id)
        .single();

      const isSuperuser = userProfile?.is_superuser || false;

      // 1️⃣ Fetch community deck by original_deck_id
      const { data: communityDeck, error: communityError } = await supabase
        .from("community_decks")
        .select("id, original_deck_id, owner_id")
        .eq("original_deck_id", deckId) // ✅ Find by original deck ID
        .single();

      if (communityError || !communityDeck) {
        return c.json({ error: "Community deck not found" }, 404);
      }

      // 2️⃣ Authorization - check if user owns the deck or is superuser
      if (communityDeck.owner_id !== user.id && !isSuperuser) {
        return c.json(
          {
            error:
              "Only the deck author or a superuser can unpublish this deck",
          },
          403,
        );
      }

      // 3️⃣ Soft-unpublish community deck
      const { error: unpublishError } = await supabase
        .from("community_decks")
        .update({ is_published: false })
        .eq("id", communityDeck.id);

      if (unpublishError) {
        console.error(
          "❌ Failed to unpublish community deck:",
          unpublishError.message,
        );
        return c.json({ error: "Failed to unpublish community deck" }, 500);
      }

      // 4️⃣ Update personal deck flags
      const { error: deckUpdateError } = await supabase
        .from("decks")
        .update({
          is_published: false,
        })
        .eq("id", deckId);

      if (deckUpdateError) {
        console.error(
          "❌ Failed to update deck publish state:",
          deckUpdateError.message,
        );
        return c.json({ error: "Failed to update deck publish state" }, 500);
      }

      console.log(`✅ Successfully unpublished deck ${deckId}`);
      return c.json({ success: true });
    } catch (error) {
      console.error("❌ Unpublish deck exception:", error);
      return c.json({ error: "Failed to unpublish deck" }, 500);
    }
  });
}
