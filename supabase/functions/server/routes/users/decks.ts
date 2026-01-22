// routes/users/decks.ts
import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { toCamelCase } from '../../lib/utils/case.ts'
import type { DeckRow, CardRow } from '../../types/decks.ts'

export function registerDecksRoutes(app: Hono) {
  app.get('/users/:userId/decks/:deckId', async c => {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data?.user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = c.req.param('userId')
    const deckId = c.req.param('deckId')

    const { data: owner } = await supabase
      .from('users')
      .select('decks_public')
      .eq('id', userId)
      .single()

    if (!owner) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (!owner.decks_public && data.user.id !== userId) {
      return c.json({ error: 'Decks are private' }, 403)
    }

    const { data: deck } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single<DeckRow>()

    if (!deck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    const { data: cards } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position')
      .returns<CardRow[]>()

    return c.json({
      deck: toCamelCase(deck),
      cards: toCamelCase(cards ?? []),
      isOwner: data.user.id === userId,
    })
  })
}