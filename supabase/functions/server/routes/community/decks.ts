import type { Hono, Context } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import {
  CommunityDeck,
  CommunityCardInsert,
  CommunityCard,
} from "../../types/community.ts";

export function registerCommunityDeckRoutes(app: Hono) {
  // Get published community decks
  app.get("/community/decks", async (c: Context) => {
    try {
      const { data: decks, error } = await supabase
        .from("community_decks")
        .select(`*, community_cards (*)`)
        .eq("is_published", true)
        .eq("is_deleted", false)
        .order("published_at", { ascending: false });

      if (error) {
        return c.json({ error: "Failed to fetch community decks" }, 500);
      }

      type CommunityDeckWithCards = CommunityDeck & {
        community_cards?: CommunityCard[];
      };

      const enriched = await Promise.all(
        (decks || []).map(async (deck: CommunityDeckWithCards) => {
          const { count } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("community_deck_id", deck.id)
            .eq("flagged", false);

          const cards = deck.community_cards ?? [];

          return {
            ...deck, // snake
            community_cards: cards, // snake
            card_count: cards.length, // snake
            comment_count: count ?? 0, // snake (from comments query)
          };
        }),
      );

      return c.json({ decks: enriched.filter((d) => (d.card_count ?? 0) > 0) });
    } catch {
      return c.json({ error: "Failed to fetch community decks" }, 500);
    }
  });

  // Get single community deck by ID
  app.get("/community/decks/:communityDeckId", async (c: Context) => {
    try {
      const id = c.req.param("communityDeckId");

      const { data: deck } = await supabase
        .from("community_decks")
        .select("*")
        .eq("id", id)
        .eq("is_published", true)
        .eq("is_deleted", false)
        .single();

      if (!deck) return c.json({ error: "Community deck not found" }, 404);

      const { data: cards } = await supabase
        .from("community_cards")
        .select("*")
        .eq("community_deck_id", id)
        .eq("is_deleted", false)
        .order("position");

      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("community_deck_id", id)
        .eq("is_deleted", false);

      return c.json({
        deck: {
          ...deck,
          community_cards: cards ?? [],
          card_count: cards?.length ?? 0,
          comment_count: count ?? 0,
        },
      });
    } catch {
      return c.json({ error: "Failed to fetch community deck" }, 500);
    }
  });

  // Update published community deck
  app.put("/community/decks/:communityDeckId", async (c: Context) => {
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

      const communityDeckId = c.req.param("communityDeckId");
      const { name, emoji, color, category, subtopic, difficulty } =
        await c.req.json();

      // ------------------------------------------------------------
      // Fetch community deck
      // ------------------------------------------------------------
      const { data: communityDeck, error: communityError } = await supabase
        .from("community_decks")
        .select("*")
        .eq("id", communityDeckId)
        .eq("is_published", true)
        .single();

      if (communityError || !communityDeck) {
        return c.json({ error: "Community deck not found" }, 404);
      }

      // ------------------------------------------------------------
      // Permission check
      // ------------------------------------------------------------
      const isOwner = communityDeck.owner_id === user.id;
      const isSuperuser = user.user_metadata?.role === "superuser";

      if (!isOwner && !isSuperuser) {
        return c.json({ error: "Forbidden" }, 403);
      }

      // ------------------------------------------------------------
      // Fetch source deck
      // ------------------------------------------------------------
      const { data: sourceDeck, error: deckError } = await supabase
        .from("decks")
        .select("*")
        .eq("id", communityDeck.original_deck_id)
        .single();

      if (deckError || !sourceDeck) {
        return c.json({ error: "Source deck not found" }, 404);
      }

      // ------------------------------------------------------------
      // Detect changes
      // ------------------------------------------------------------
      const metadataChanged =
        (name !== undefined && name !== communityDeck.name) ||
        (emoji !== undefined && emoji !== communityDeck.emoji) ||
        (color !== undefined && color !== communityDeck.color) ||
        (category !== undefined && category !== communityDeck.category) ||
        (subtopic !== undefined && subtopic !== communityDeck.subtopic) ||
        (difficulty !== undefined && difficulty !== communityDeck.difficulty);

      const cardsChanged =
        sourceDeck.content_updated_at &&
        (!communityDeck.source_content_updated_at ||
          sourceDeck.content_updated_at >
            communityDeck.source_content_updated_at);

      console.log("metadata changed?", metadataChanged);
      console.log("cards changed?", cardsChanged);
      console.log(
        "source deck content updated at",
        sourceDeck.content_updated_at,
      );
      console.log(
        "community deck source content updated at",
        communityDeck.source_content_updated_at,
      );

      const shouldRepublish = metadataChanged || cardsChanged;

      if (!shouldRepublish) {
        return c.json({ error: "No changes detected" }, 400);
      }

      const now = new Date().toISOString();

      // ------------------------------------------------------------
      // SAFETY: prepare cards FIRST if cards changed
      // ------------------------------------------------------------
      let preparedCommunityCards: CommunityCardInsert[] | null = null;

      if (cardsChanged) {
        await supabase
          .from("community_decks")
          .update({
            source_content_updated_at: sourceDeck.content_updated_at,
          })
          .eq("id", communityDeckId);

        const { data: sourceCards, error: cardsError } = await supabase
          .from("cards")
          .select("*")
          .eq("deck_id", sourceDeck.id)
          .order("position", { ascending: true });

        const typedSourceCards = (sourceCards ?? []) as SourceCardRow[];

        if (cardsError) {
          return c.json({ error: "Failed to fetch source cards" }, 500);
        }

        if (!sourceCards || sourceCards.length === 0) {
          return c.json(
            { error: "Source deck has no cards — cannot republish" },
            400,
          );
        }

        type SourceCardRow = {
          front: string | null;
          back: string | null;
          card_type: "classic-flip" | "multiple-choice" | "type-answer";

          correct_answers: string[] | null;
          incorrect_answers: string[] | null;
          accepted_answers: string[] | null;

          front_image_url: string | null;
          back_image_url: string | null;

          audio_url: string | null;
          front_audio: string | null;
          back_audio: string | null;
        };

        preparedCommunityCards = typedSourceCards.map(
          (card, index): CommunityCardInsert => ({
            community_deck_id: communityDeckId,

            front: card.front ?? null,
            back: card.back ?? null,

            card_type: card.card_type,

            correct_answers: card.correct_answers ?? null,
            incorrect_answers: card.incorrect_answers ?? null,
            accepted_answers: card.accepted_answers ?? null,

            audio_url: card.audio_url ?? null,

            front_image_url: card.front_image_url ?? null,
            back_image_url: card.back_image_url ?? null,

            front_audio: card.front_audio ?? null,
            back_audio: card.back_audio ?? null,

            position: index,

            created_at: now,
            updated_at: now,
          }),
        );
      }

      // ------------------------------------------------------------
      // Update community deck metadata
      // ------------------------------------------------------------

      const nextVersion = (communityDeck.version ?? 1) + 1;
      const { error: updateDeckError } = await supabase
        .from("community_decks")
        .update({
          ...(name !== undefined && { name }),
          ...(emoji !== undefined && { emoji }),
          ...(color !== undefined && { color }),
          ...(category !== undefined && { category }),
          ...(subtopic !== undefined && { subtopic }),
          ...(difficulty !== undefined && { difficulty }),
          ...(cardsChanged && {
            card_count: preparedCommunityCards?.length ?? 0,
          }),
          updated_at: now,
          ...(cardsChanged && { source_content_updated_at: now }),
          version: nextVersion,
        })
        .eq("id", communityDeckId);

      if (updateDeckError) {
        return c.json({ error: "Failed to update community deck" }, 500);
      }

      // ------------------------------------------------------------
      // Replace community cards (SAFE)
      // ------------------------------------------------------------
      if (cardsChanged && preparedCommunityCards) {
        const { error: deleteError } = await supabase
          .from("community_cards")
          .delete()
          .eq("community_deck_id", communityDeckId);

        if (deleteError) {
          return c.json({ error: "Failed to clear community cards" }, 500);
        }

        const { error: insertError } = await supabase
          .from("community_cards")
          .insert(preparedCommunityCards);

        if (insertError) {
          return c.json({ error: "Failed to insert community cards" }, 500);
        }
      }

      // ------------------------------------------------------------
      // Success
      // ------------------------------------------------------------
      return c.json({
        success: true,
        metadataUpdated: metadataChanged,
        cardsUpdated: cardsChanged,
        updatedAt: now,
      });
    } catch (error) {
      console.error("❌ Update community deck exception:", error);
      return c.json({ error: "Failed to update community deck" }, 500);
    }
  });

  // Get download counts for deck IDs
  app.post("/community/downloads", async (c: Context) => {
    try {
      const { deckIds } = await c.req.json();

      if (!Array.isArray(deckIds)) {
        return c.json({ error: "Invalid deck IDs" }, 400);
      }

      if (deckIds.length === 0) {
        return c.json({ downloads: {} });
      }

      const { data, error } = await supabase
        .from("community_decks")
        .select("id, download_count")
        .in("id", deckIds);

      if (error) {
        console.error("❌ Download fetch error:", error.message);
        return c.json({ error: "Failed to fetch download counts" }, 500);
      }

      const downloads: Record<string, number> = {};

      for (const deck of data ?? []) {
        downloads[deck.id] = deck.download_count ?? 0;
      }

      return c.json({ downloads });
    } catch (error) {
      console.error("❌ Get downloads exception:", error);
      return c.json({ error: "Failed to fetch download counts" }, 500);
    }
  });
}
