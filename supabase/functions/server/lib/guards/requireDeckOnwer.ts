import type { Context } from 'npm:hono@4'
import { supabase } from '../supabase.ts'
import type { Deck } from '../../types/decks.ts'
import type { User } from '../../types/users.ts'

export async function requireDeckOwner(
  c: Context,
  user: User,
  deckId: string
): Promise<{ deck: Deck } | { error: Response }> {

  const { data: deck } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single<Deck>()

  if (!deck) {
    return { error: c.json({ error: 'Deck not found' }, 404) }
  }

  return { deck }
}