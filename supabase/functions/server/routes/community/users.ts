import type { Hono } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";

export function registerCommunityUsersRoutes(app: Hono) {
  // Search for users who have published decks to the community
  app.get("/community/users/search", async (c) => {
    const query = c.req.query("q")?.toLowerCase() ?? "";

    if (query.length < 2) {
      return c.json({ users: [] });
    }

    const { data, error } = await supabase
      .from("community_user_stats")
      .select("id, name, display_name, avatar_url, deck_count")
      .or(`name.ilike.%${query}%,display_name.ilike.%${query}%`)
      .order("deck_count", { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
      return c.json({ error: "Failed to search users" }, 500);
    }

    return c.json({
      users: data.map((u) => ({
        id: u.id,
        name: u.display_name ?? u.name,
        avatarUrl: u.avatar_url,
        deckCount: u.deck_count,
      })),
    });
  });
}
