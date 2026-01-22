import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { toCamelCase } from '../../lib/utils/case.ts'
import type { CommunityCard } from '../../types/community.ts'

export function registerCommunityFeaturedRoutes(app: Hono) {
  app.get('/community/decks/featured', async (c: Context) => {
    try {
      console.log('Fetching featured community decks')
      const { data: decks } = await supabase
        .from('community_decks')
        .select('*')
        .eq('featured', true)
        .eq('is_published', true)
        .eq('is_deleted', false)
        .order('published_at', { ascending: false })

      if (!decks?.length) return c.json({ decks: [] })

      const deckIds = decks.map(d => d.id)

      const { data: cards } = await supabase
        .from('community_cards')
        .select('*')
        .eq('is_deleted', false)
        .in('community_deck_id', deckIds)
        .order('position')

      const grouped: Record<string, CommunityCard[]> = {}
      for (const card of cards ?? []) {
        ;(grouped[card.community_deck_id] ??= []).push(toCamelCase(card))
      }

      const enriched = await Promise.all(
        decks.map(async deck => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('community_deck_id', deck.id)
            .eq('flagged', false)

          const deckCards = grouped[deck.id] ?? []

          return {
            ...toCamelCase(deck),
            cards: deckCards,
            cardCount: deckCards.length,
            commentCount: count ?? 0
          }
        })
      )

      return c.json({ decks: enriched.filter(d => d.cardCount > 0) })
    } catch {
      return c.json({ error: 'Failed to fetch featured decks' }, 500)
    }
  })
}