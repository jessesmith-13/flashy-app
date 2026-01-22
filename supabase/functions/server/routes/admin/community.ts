import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { requireSuperuser } from '../../lib/guards/requireSuperuser.ts'

export function registerAdminCommunityRoutes(app: Hono) {

  app.delete('/admin/community/decks/:id', async c => {
    const guard = await requireSuperuser(c)
    if (!guard.ok) return guard.response

    const deckId = c.req.param('id')

    // Get deck details including owner before deleting
    const { data: deck, error: deckError } = await supabase
      .from('community_decks')
      .select('owner_id, name')
      .eq('id', deckId)
      .single()

    if (deckError || !deck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Soft delete the deck
    await supabase
      .from('community_decks')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: guard.user.id,
      })
      .eq('id', deckId)

    // Send notification to deck owner
    if (deck.owner_id && deck.owner_id !== guard.user.id) {
      const notificationId = crypto.randomUUID()
      await supabase
        .from('notifications')
        .insert({
          id: notificationId,
          user_id: deck.owner_id,
          type: 'admin_action',
          data: {
            action: 'deck_deleted',
            deckId: deckId,
            deckName: deck.name,
            message: `Your community deck "${deck.name}" has been removed by a moderator.`
          },
          created_at: new Date().toISOString()
        })
    }

    return c.json({ success: true })
  })

  app.delete('/admin/community/decks/:deckId/cards/:cardId', async c => {
    const guard = await requireSuperuser(c)
    if (!guard.ok) return guard.response

    const deckId = c.req.param('deckId')
    const cardId = c.req.param('cardId')

    console.log(`🗑️ Deleting card ${cardId} from deck ${deckId}`)

    // Get deck and card details before deleting (don't filter by is_deleted - we may be deleting cards from deleted decks)
    const { data: deck, error: deckError } = await supabase
      .from('community_decks')
      .select('owner_id, name, is_deleted')
      .eq('id', deckId)
      .maybeSingle()

    console.log(`Deck query result:`, { deck, deckError })

    if (deckError) {
      console.error(`❌ Error querying deck: ${deckId}`, deckError)
      return c.json({ error: 'Database error', deckId, deckError: deckError.message }, 500)
    }

    if (!deck) {
      console.error(`❌ Deck not found: ${deckId}`)
      return c.json({ error: 'Deck not found', deckId }, 404)
    }

    const { data: card, error: cardError } = await supabase
      .from('community_cards')
      .select('front, is_deleted')
      .eq('id', cardId)
      .eq('community_deck_id', deckId)
      .maybeSingle()

    console.log(`Card query result:`, { card, cardError })

    if (cardError) {
      console.error(`❌ Error querying card: ${cardId} in deck ${deckId}`, cardError)
      return c.json({ error: 'Database error', cardId, deckId, cardError: cardError.message }, 500)
    }

    if (!card) {
      console.error(`❌ Card not found: ${cardId} in deck ${deckId}`)
      return c.json({ error: 'Card not found', cardId, deckId }, 404)
    }

    // Soft delete the card
    const { error: deleteError } = await supabase
      .from('community_cards')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: guard.user.id,
      })
      .eq('id', cardId)
      .eq('community_deck_id', deckId)

    if (deleteError) {
      console.error(`❌ Failed to delete card:`, deleteError)
      return c.json({ error: 'Failed to delete card', deleteError: deleteError.message }, 500)
    }

    console.log(`✅ Card ${cardId} soft deleted`)

    // Send notification to deck owner
    if (deck.owner_id && deck.owner_id !== guard.user.id) {
      const notificationId = crypto.randomUUID()
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          id: notificationId,
          user_id: deck.owner_id,
          type: 'admin_action',
          data: {
            action: 'card_deleted',
            deckId: deckId,
            deckName: deck.name,
            cardId: cardId,
            cardFront: card.front,
            message: `A card has been removed from your community deck "${deck.name}" by a moderator.`
          },
          created_at: new Date().toISOString()
        })

      if (notifError) {
        console.error(`❌ Failed to create notification:`, notifError)
      } else {
        console.log(`✅ Notification sent to user ${deck.owner_id}`)
      }
    }

    return c.json({ success: true })
  })

  app.patch('/admin/community/decks/:id/featured', async c => {
    const guard = await requireSuperuser(c)
    if (!guard.ok) return guard.response

    const { data } = await supabase
      .from('community_decks')
      .select('featured')
      .eq('id', c.req.param('id'))
      .single()

    await supabase
      .from('community_decks')
      .update({ featured: !data?.featured })
      .eq('id', c.req.param('id'))

    return c.json({ success: true })
  })
}