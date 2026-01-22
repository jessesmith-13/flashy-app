import type { Hono } from "npm:hono@4";
import type { Context } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import { toCamelCase } from "../../lib/utils/case.ts";

export interface UnsplashAttribution {
  photographerName: string;
  photographerUsername: string;
  photographerUrl: string;
  unsplashUrl: string;
  downloadUrl: string;
}

type BatchCardInput = {
  front?: string;
  back?: string;
  cardType?: string;
  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];
  frontImageUrl?: string;
  backImageUrl?: string;
  frontImageAttribution?: UnsplashAttribution;
  backImageAttribution?: UnsplashAttribution;
  frontAudio?: string;
  backAudio?: string;
};

type CreateCardInput = {
  front?: string;
  back?: string;
  cardType?: "classic-flip" | "multiple-choice" | "type-answer";
  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];
  frontImageUrl?: string;
  backImageUrl?: string;
  frontImageAttribution?: UnsplashAttribution;
  backImageAttribution?: UnsplashAttribution;
  frontAudio?: string;
  backAudio?: string;
  position?: number;
};

type UpdateCardInput = {
  front?: string;
  back?: string;
  cardType?: string;
  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];
  frontImageUrl?: string;
  backImageUrl?: string;
  frontImageAttribution?: UnsplashAttribution;
  backImageAttribution?: UnsplashAttribution;
  frontAudio?: string;
  backAudio?: string;
  position?: number;
  favorite?: boolean;
  isIgnored?: boolean;
};

type PositionsInput = {
  id: string;
  position: number;
}[];

export function registerCardsRoutes(app: Hono) {
  // ------------------------------------------------------------
  // Get all cards for a deck
  // ------------------------------------------------------------
  app.get("/decks/:deckId/cards", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser(accessToken);

      const user = authData?.user;
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");

      const { data: deck } = await supabase
        .from("decks")
        .select("id")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .single();

      if (!deck) {
        return c.json({ error: "Deck not found" }, 404);
      }

      const { data: cards, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("position");

      if (error) {
        return c.json({ error: "Failed to fetch cards" }, 500);
      }

      return c.json({ cards: cards?.map(toCamelCase) ?? [] });
    } catch {
      return c.json({ error: "Failed to fetch cards" }, 500);
    }
  });

  // ------------------------------------------------------------
  // Batch create cards
  // ------------------------------------------------------------
  app.post("/decks/:deckId/cards/batch", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const { data: authData } = await supabase.auth.getUser(accessToken);
      const user = authData?.user;
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");
      const body = await c.req.json<{ cards: BatchCardInput[] }>();

      if (!Array.isArray(body.cards) || body.cards.length === 0) {
        return c.json({ error: "Cards array is required" }, 400);
      }

      const { data: deck } = await supabase
        .from("decks")
        .select("id, card_count")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .single();

      if (!deck) {
        return c.json({ error: "Deck not found" }, 404);
      }

      const { data: lastCard } = await supabase
        .from("cards")
        .select("position")
        .eq("deck_id", deckId)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const startPosition = lastCard?.position ?? -1;

      const newCards = body.cards.map((card, index) => ({
        id: crypto.randomUUID(),
        deck_id: deckId,
        front: card.front,
        back: card.back,
        card_type: card.cardType ?? "classic-flip",
        position: startPosition + index + 1,
        created_at: new Date().toISOString(),
        ...(card.correctAnswers && { correct_answers: card.correctAnswers }),
        ...(card.incorrectAnswers && {
          incorrect_answers: card.incorrectAnswers,
        }),
        ...(card.acceptedAnswers && { accepted_answers: card.acceptedAnswers }),
        ...(card.frontImageUrl && { front_image_url: card.frontImageUrl }),
        ...(card.backImageUrl && { back_image_url: card.backImageUrl }),
        ...(card.frontImageAttribution && {
          front_image_attribution: card.frontImageAttribution,
        }),
        ...(card.backImageAttribution && {
          back_image_attribution: card.backImageAttribution,
        }),
        ...(card.frontAudio && { front_audio: card.frontAudio }),
        ...(card.backAudio && { back_audio: card.backAudio }),
      }));

      const { data: createdCards, error } = await supabase
        .from("cards")
        .insert(newCards)
        .select();

      if (error || !createdCards) {
        return c.json({ error: "Failed to create cards" }, 500);
      }

      // Update deck card count
      const newCardCount = (deck.card_count ?? 0) + createdCards.length;
      await supabase
        .from("decks")
        .update({ card_count: newCardCount })
        .eq("id", deckId);

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING
      // ============================================================

      // Get current achievements
      const { data: currentAchievements } = await supabase
        .from("user_achievements")
        .select(
          "unlocked_achievement_ids, created_multiple_choice_card, created_type_answer_card, created_classic_flip_card, total_cards",
        )
        .eq("user_id", user.id)
        .single();

      const currentUnlocked =
        currentAchievements?.unlocked_achievement_ids || [];
      const newlyUnlocked: string[] = [];

      // Track card types created in this batch
      let hasMultipleChoice =
        currentAchievements?.created_multiple_choice_card || false;
      let hasTypeAnswer =
        currentAchievements?.created_type_answer_card || false;
      let hasClassicFlip =
        currentAchievements?.created_classic_flip_card || false;

      for (const card of body.cards) {
        if (card.cardType === "multiple-choice") {
          hasMultipleChoice = true;
        }
        if (card.cardType === "type-answer") {
          hasTypeAnswer = true;
        }
        if (card.cardType === "classic-flip") {
          hasClassicFlip = true;
        }
      }

      // Check Card Variety achievement
      if (
        hasMultipleChoice &&
        hasTypeAnswer &&
        hasClassicFlip &&
        !currentUnlocked.includes("card-variety")
      ) {
        newlyUnlocked.push("card-variety");
      }

      // Update total cards count
      const newTotalCards =
        (currentAchievements?.total_cards || 0) + createdCards.length;

      // Check Ambitious Creator achievement (100+ cards in a single deck)
      if (
        newCardCount >= 100 &&
        !currentUnlocked.includes("hundred-card-deck")
      ) {
        newlyUnlocked.push("hundred-card-deck");
      }

      // Update achievements in database
      await supabase.from("user_achievements").upsert(
        {
          user_id: user.id,
          created_multiple_choice_card: hasMultipleChoice,
          created_type_answer_card: hasTypeAnswer,
          created_classic_flip_card: hasClassicFlip,
          total_cards: newTotalCards,
          unlocked_achievement_ids: [...currentUnlocked, ...newlyUnlocked],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (newlyUnlocked.length > 0) {
        console.log(
          `🎉 User ${user.id} unlocked achievements: ${newlyUnlocked.join(
            ", ",
          )}`,
        );
      }
      console.log(
        `🎴 Batch created ${createdCards.length} cards. Deck now has ${newCardCount} cards, user has ${newTotalCards} total cards`,
      );

      return c.json({
        cards: createdCards.map(toCamelCase),
        count: createdCards.length,
      });
    } catch (error) {
      console.log(`❌ Batch create cards exception: ${error}`);
      return c.json({ error: "Failed to create cards" }, 500);
    }
  });

  // ------------------------------------------------------------
  // Create single card
  // ------------------------------------------------------------
  app.post("/decks/:deckId/cards", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const { data: authData } = await supabase.auth.getUser(accessToken);
      const user = authData?.user;
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");
      const body = await c.req.json<CreateCardInput>();

      const { data: deck } = await supabase
        .from("decks")
        .select("id, card_count")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .single();

      if (!deck) {
        return c.json({ error: "Deck not found" }, 404);
      }

      const { data: lastCard } = await supabase
        .from("cards")
        .select("position")
        .eq("deck_id", deckId)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const position = (lastCard?.position ?? -1) + 1;
      const now = new Date().toISOString();

      const cardData = {
        deck_id: deckId,
        front: body.front,
        back: body.back,
        card_type: body.cardType ?? "classic-flip",
        position,
        created_at: now,
        updated_at: now,
        ...(body.correctAnswers && { correct_answers: body.correctAnswers }),
        ...(body.incorrectAnswers && {
          incorrect_answers: body.incorrectAnswers,
        }),
        ...(body.acceptedAnswers && { accepted_answers: body.acceptedAnswers }),
        ...(body.frontImageUrl && { front_image_url: body.frontImageUrl }),
        ...(body.backImageUrl && { back_image_url: body.backImageUrl }),
        ...(body.frontImageAttribution && {
          front_image_attribution: body.frontImageAttribution,
        }),
        ...(body.backImageAttribution && {
          back_image_attribution: body.backImageAttribution,
        }),
        ...(body.frontAudio && { front_audio: body.frontAudio }),
        ...(body.backAudio && { back_audio: body.backAudio }),
      };

      const { data: newCard, error } = await supabase
        .from("cards")
        .insert(cardData)
        .select()
        .single();

      if (error || !newCard) {
        return c.json({ error: "Failed to create card" }, 500);
      }

      // Update deck card count
      const newCardCount = (deck.card_count ?? 0) + 1;
      await supabase
        .from("decks")
        .update({ card_count: newCardCount })
        .eq("id", deckId);

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING
      // ============================================================

      // Get current achievements
      const { data: currentAchievements } = await supabase
        .from("user_achievements")
        .select(
          "unlocked_achievement_ids, created_multiple_choice_card, created_type_answer_card, created_classic_flip_card, total_cards",
        )
        .eq("user_id", user.id)
        .single();

      const currentUnlocked =
        currentAchievements?.unlocked_achievement_ids || [];
      const newlyUnlocked: string[] = [];

      // Track card type
      let hasMultipleChoice =
        currentAchievements?.created_multiple_choice_card || false;
      let hasTypeAnswer =
        currentAchievements?.created_type_answer_card || false;
      let hasClassicFlip =
        currentAchievements?.created_classic_flip_card || false;

      if (body.cardType === "multiple-choice") {
        hasMultipleChoice = true;
      }
      if (body.cardType === "type-answer") {
        hasTypeAnswer = true;
      }
      if (body.cardType === "classic-flip") {
        hasClassicFlip = true;
      }

      // Check Card Variety achievement
      if (
        hasMultipleChoice &&
        hasTypeAnswer &&
        hasClassicFlip &&
        !currentUnlocked.includes("card-variety")
      ) {
        newlyUnlocked.push("card-variety");
      }

      // Update total cards count
      const newTotalCards = (currentAchievements?.total_cards || 0) + 1;

      // Check Ambitious Creator achievement (100+ cards in a single deck)
      if (
        newCardCount >= 100 &&
        !currentUnlocked.includes("hundred-card-deck")
      ) {
        newlyUnlocked.push("hundred-card-deck");
      }

      // Update achievements in database
      const { error: upsertError } = await supabase
        .from("user_achievements")
        .upsert(
          {
            user_id: user.id,
            created_multiple_choice_card: hasMultipleChoice,
            created_type_answer_card: hasTypeAnswer,
            created_classic_flip_card: hasClassicFlip,
            total_cards: newTotalCards,
            unlocked_achievement_ids: [...currentUnlocked, ...newlyUnlocked],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (upsertError) {
        console.log(`⚠️ Failed to update achievements: ${upsertError.message}`);
      }

      if (newlyUnlocked.length > 0) {
        console.log(
          `🎉 User ${user.id} unlocked achievements: ${newlyUnlocked.join(
            ", ",
          )}`,
        );
      }
      console.log(
        `🎴 Created card. Deck now has ${newCardCount} cards, user has ${newTotalCards} total cards`,
      );

      return c.json({ card: toCamelCase(newCard) });
    } catch (error) {
      console.log(`❌ Create card exception: ${error}`);
      return c.json({ error: "Failed to create card" }, 500);
    }
  });

  // ------------------------------------------------------------
  // Update card positions
  // ------------------------------------------------------------
  app.put("/decks/:deckId/cards/positions", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const { data: authData } = await supabase.auth.getUser(accessToken);
      const user = authData?.user;
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");
      const body = await c.req.json<{ positions: PositionsInput }>();

      await Promise.all(
        body.positions.map((p) =>
          supabase
            .from("cards")
            .update({ position: p.position })
            .eq("id", p.id)
            .eq("deck_id", deckId),
        ),
      );

      return c.json({ success: true });
    } catch {
      return c.json({ error: "Failed to update card positions" }, 500);
    }
  });

  // ------------------------------------------------------------
  // Update card
  // ------------------------------------------------------------
  app.put("/decks/:deckId/cards/:cardId", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const { data: authData } = await supabase.auth.getUser(accessToken);
      const user = authData?.user;
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");
      const cardId = c.req.param("cardId");
      const updates = await c.req.json<UpdateCardInput>();

      const dbUpdates: Record<string, unknown> = {
        ...(updates.front !== undefined && { front: updates.front }),
        ...(updates.back !== undefined && { back: updates.back }),
        ...(updates.cardType !== undefined && { card_type: updates.cardType }),
        ...(updates.correctAnswers && {
          correct_answers: updates.correctAnswers,
        }),
        ...(updates.incorrectAnswers && {
          incorrect_answers: updates.incorrectAnswers,
        }),
        ...(updates.acceptedAnswers && {
          accepted_answers: updates.acceptedAnswers,
        }),
        ...(updates.frontImageUrl && {
          front_image_url: updates.frontImageUrl,
        }),
        ...(updates.backImageUrl && { back_image_url: updates.backImageUrl }),
        ...(updates.frontImageAttribution && {
          front_image_attribution: updates.frontImageAttribution,
        }),
        ...(updates.backImageAttribution && {
          back_image_attribution: updates.backImageAttribution,
        }),
        ...(updates.frontAudio && { front_audio: updates.frontAudio }),
        ...(updates.backAudio && { back_audio: updates.backAudio }),
        ...(updates.position !== undefined && { position: updates.position }),
        ...(updates.favorite !== undefined && { favorite: updates.favorite }),
        ...(updates.isIgnored !== undefined && {
          is_ignored: updates.isIgnored,
        }),
      };

      const { data: updatedCard, error } = await supabase
        .from("cards")
        .update(dbUpdates)
        .eq("id", cardId)
        .eq("deck_id", deckId)
        .select()
        .single();

      if (error || !updatedCard) {
        return c.json({ error: "Failed to update card" }, 500);
      }

      return c.json({ card: toCamelCase(updatedCard) });
    } catch {
      return c.json({ error: "Failed to update card" }, 500);
    }
  });

  // ------------------------------------------------------------
  // Delete card
  // ------------------------------------------------------------
  app.delete("/decks/:deckId/cards/:cardId", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const { data: authData } = await supabase.auth.getUser(accessToken);
      const user = authData?.user;
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const deckId = c.req.param("deckId");
      const cardId = c.req.param("cardId");

      const { data: deck } = await supabase
        .from("decks")
        .select("user_id, is_community")
        .eq("id", deckId)
        .single();

      if (!deck || deck.user_id !== user.id || deck.is_community) {
        return c.json({ error: "Forbidden" }, 403);
      }

      // Delete the card
      await supabase
        .from("cards")
        .delete()
        .eq("id", cardId)
        .eq("deck_id", deckId);

      // ✅ COUNT actual remaining cards instead of subtracting!
      const { count } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", deckId);

      // Update with the ACTUAL count
      await supabase
        .from("decks")
        .update({ card_count: count ?? 0 })
        .eq("id", deckId);

      console.log(
        `🗑️ Deleted card ${cardId}. Deck ${deckId} now has ${count ?? 0} cards`,
      );

      return c.json({ success: true });
    } catch (error) {
      console.error("❌ Delete card error:", error);
      return c.json({ error: "Failed to delete card" }, 500);
    }
  });
}
