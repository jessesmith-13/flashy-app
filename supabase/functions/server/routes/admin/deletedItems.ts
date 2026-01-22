import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { requireSuperuser } from '../../lib/guards/requireSuperuser.ts'
import { CommentResponse } from "../../types/community.ts";

export function registerAdminDeletedItemRoutes(app: Hono) {

  // Get all deleted items (decks and cards and comments)
  app.get('/admin/deleted-items', async c => {
    const guard = await requireSuperuser(c)
    if (!guard.ok) return guard.response

    console.log('📋 Fetching all deleted items...')

    // Fetch deleted comments with deck information
    const { data: deletedComments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        community_decks!inner (
          name,
          emoji,
          color
        )
      `)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    if (commentsError) {
      console.error('❌ Error fetching deleted comments:', commentsError)
      return c.json({ error: 'Failed to fetch deleted comments', details: commentsError.message }, 500)
    }

    // Fetch deleted replies with deck information
    const { data: deletedReplies, error: repliesError } = await supabase
      .from('replies')
      .select(`
        *,
        comments!inner (
          community_deck_id,
          community_decks!inner (
            name,
            emoji,
            color
          )
        )
      `)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    if (repliesError) {
      console.error('❌ Error fetching deleted replies:', repliesError)
      return c.json({ error: 'Failed to fetch deleted replies', details: repliesError.message }, 500)
    }

    // Fetch deleted decks with owner information
    const { data: deletedDecks, error: decksError } = await supabase
      .from('community_decks')
      .select(`
        id,
        name,
        emoji,
        color,
        category,
        subtopic,
        owner_id,
        owner_display_name,
        is_deleted,
        deleted_at,
        deleted_by,
        created_at,
        published_at,
        card_count
      `)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    if (decksError) {
      console.error('❌ Error fetching deleted decks:', decksError)
      return c.json({ error: 'Failed to fetch deleted decks', details: decksError.message }, 500)
    }

    // Fetch deleted cards with deck and owner information
    const { data: deletedCards, error: cardsError } = await supabase
      .from('community_cards')
      .select(`
        id,
        front,
        back,
        card_type,
        community_deck_id,
        is_deleted,
        deleted_at,
        deleted_by,
        created_at,
        community_decks!inner (
          id,
          name,
          owner_id,
          owner_display_name,
          emoji,
          color
        )
      `)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    if (cardsError) {
      console.error('❌ Error fetching deleted cards:', cardsError)
      return c.json({ error: 'Failed to fetch deleted cards', details: cardsError.message }, 500)
    }

    // Map comments data with deck information
    const commentsData = (deletedComments || []).map(comment => ({
      communityDeckId: comment.community_deck_id,
      communityDeckName: comment.community_decks?.name || 'Unknown Deck',
      communityDeckEmoji: comment.community_decks?.emoji || '📚',
      communityDeckColor: comment.community_decks?.color || '#gray',
      content: comment.content,
      createdAt: comment.created_at,
      deletedAt: comment.deleted_at,
      deletedBy: comment.deleted_by,
      deletedByDisplayName: comment.deleted_by_display_name,
      deletedReason: comment.deleted_reason,
      id: comment.id,
      isDeleted: comment.is_deleted,
      isFlagged: comment.is_flagged,
      updatedAt: comment.updated_at,
      userAvatar: comment.user_avatar,
      userDisplayName: comment.user_display_name,
      userId: comment.user_id,
      userName: comment.user_name,
    }))

    // Map replies data with deck information (through parent comment)
    const repliesData = (deletedReplies || []).map(reply => ({
      ...reply,
      communityDeckId: reply.comments?.community_deck_id,
      communityDeckName: reply.comments?.community_decks?.name || 'Unknown Deck',
      communityDeckEmoji: reply.comments?.community_decks?.emoji || '📚',
      communityDeckColor: reply.comments?.community_decks?.color || '#gray',
    }))

    // Get unique user IDs to fetch user details
    const deckOwnerIds = [...new Set(deletedDecks?.map(d => d.owner_id).filter(Boolean) || [])]
    const cardOwnerIds = [...new Set(deletedCards?.map(c => c.community_decks?.owner_id).filter(Boolean) || [])]
    const deletedByIds = [
      ...new Set([
        ...(deletedDecks?.map(d => d.deleted_by).filter(Boolean) || []),
        ...(deletedCards?.map(c => c.deleted_by).filter(Boolean) || [])
      ])
    ]
    const allUserIds = [...new Set([...deckOwnerIds, ...cardOwnerIds, ...deletedByIds])]

    // Fetch user details
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', allUserIds)

    const usersMap = (users || []).reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as Record<string, any>)

    // Enrich deleted decks with user information
    const enrichedDecks = (deletedDecks || []).map(deck => ({
      id: deck.id,
      name: deck.name,
      emoji: deck.emoji,
      color: deck.color,
      category: deck.category,
      subtopic: deck.subtopic,
      ownerId: deck.owner_id,
      isDeleted: deck.is_deleted,
      deletedAt: deck.deleted_at,
      deletedBy: deck.deleted_by,
      createdAt: deck.created_at,
      publishedAt: deck.published_at,
      ownerName: usersMap[deck.owner_id]?.name || 'Unknown',
      ownerEmail: usersMap[deck.owner_id]?.email || 'Unknown',
      deletedByName: usersMap[deck.deleted_by]?.name || 'Unknown',
      cardCount: deck.card_count,
      ownerDisplayName: deck.owner_display_name,
    }))

    // Enrich deleted cards with user information
    const enrichedCards = (deletedCards || []).map(card => ({
      id: card.id,
      front: card.front,
      back: card.back,
      cardType: card.card_type,
      communityDeckId: card.community_deck_id,
      isDeleted: card.is_deleted,
      deletedAt: card.deleted_at,
      deletedBy: card.deleted_by,
      createdAt: card.created_at,
      deckName: card.community_decks?.name || 'Unknown Deck',
      deckEmoji: card.community_decks?.emoji || '📚',
      deckColor: card.community_decks?.color || '#gray',
      deckOwnerId: card.community_decks?.owner_id,
      ownerName: usersMap[card.community_decks?.owner_id]?.name || 'Unknown',
      ownerEmail: usersMap[card.community_decks?.owner_id]?.email || 'Unknown',
      deletedByName: usersMap[card.deleted_by]?.name || 'Unknown',
      ownerDisplayName: card.community_decks?.owner_display_name,
    }))

    console.log(`✅ Found ${commentsData.length} deleted comments, ${repliesData.length} deleted replies, ${enrichedDecks.length} deleted decks, and ${enrichedCards.length} deleted cards`)

    return c.json({
      comments: commentsData,
      replies: repliesData,
      decks: enrichedDecks,
      cards: enrichedCards,
      totalComments: commentsData.length,
      totalReplies: repliesData.length,
      totalDecks: enrichedDecks.length,
      totalCards: enrichedCards.length
    })
  })

  // Restore deleted item (comment, deck, or card)
  app.post('/admin/deleted-items/restore', async c => {
    const guard = await requireSuperuser(c)
    if (!guard.ok) return guard.response

    const { itemId, itemType } = await c.req.json()

    if (!itemId || !itemType) {
      return c.json({ error: 'Missing itemId or itemType' }, 400)
    }

    if (!['comment', 'deck', 'card'].includes(itemType)) {
      return c.json({ error: 'Invalid itemType. Must be "comment", "deck", or "card"' }, 400)
    }

    console.log(`🔄 Restoring ${itemType} ${itemId}`)

    let result
    let itemName: string

    try {
      switch (itemType) {
        case 'comment': {
          
          // Get comment details before restoring
          const { data: comment } = await supabase
            .from('comments')
            .select('content, user_id')
            .eq('id', itemId)
            .single()

          // Restore the comment
          const { error: commentError } = await supabase
            .from('comments')
            .update({
              is_deleted: false,
              deleted_at: null,
              deleted_by: null,
            })
            .eq('id', itemId)

          if (commentError) {
            console.error(`❌ Failed to restore comment:`, commentError)
            return c.json({ error: 'Failed to restore comment', details: commentError.message }, 500)
          }

          itemName = comment?.content?.substring(0, 50) || 'Comment'

          // Send notification to comment owner
          if (comment?.user_id && comment.user_id !== guard.user.id) {
            const notificationId = crypto.randomUUID()
            await supabase
              .from('notifications')
              .insert({
                id: notificationId,
                user_id: comment.user_id,
                type: 'admin_action',
                data: {
                  action: 'comment_restored',
                  commentId: itemId,
                  message: `Your comment has been restored by a moderator.`
                },
                created_at: new Date().toISOString()
              })
          }

          result = { success: true, itemType: 'comment', itemId }
          break
        }

        case 'deck': {

          // Get deck details before restoring
          const { data: deck } = await supabase
            .from('community_decks')
            .select('name, owner_id')
            .eq('id', itemId)
            .single()

          // Restore the deck
          const { error: deckError } = await supabase
            .from('community_decks')
            .update({
              is_deleted: false,
              deleted_at: null,
              deleted_by: null,
            })
            .eq('id', itemId)

          if (deckError) {
            console.error(`❌ Failed to restore deck:`, deckError)
            return c.json({ error: 'Failed to restore deck', details: deckError.message }, 500)
          }

          itemName = deck?.name || 'Deck'

          // Send notification to deck owner
          if (deck?.owner_id && deck.owner_id !== guard.user.id) {
            const notificationId = crypto.randomUUID()
            await supabase
              .from('notifications')
              .insert({
                id: notificationId,
                user_id: deck.owner_id,
                type: 'admin_action',
                data: {
                  action: 'deck_restored',
                  deckId: itemId,
                  deckName: deck.name,
                  message: `Your community deck "${deck.name}" has been restored by a moderator.`
                },
                created_at: new Date().toISOString()
              })
          }

          result = { success: true, itemType: 'deck', itemId }
          break
        }

        case 'card': {

          // Get card and deck details before restoring
          const { data: card } = await supabase
            .from('community_cards')
            .select(`
              front,
              community_deck_id,
              community_decks (
                name,
                owner_id
              )
            `)
            .eq('id', itemId)
            .single()

          // Restore the card
          const { error: cardError } = await supabase
            .from('community_cards')
            .update({
              is_deleted: false,
              deleted_at: null,
              deleted_by: null,
            })
            .eq('id', itemId)

          if (cardError) {
            console.error(`❌ Failed to restore card:`, cardError)
            return c.json({ error: 'Failed to restore card', details: cardError.message }, 500)
          }

          itemName = card?.front || 'Card'

          // Send notification to deck owner
          if (card?.community_decks?.owner_id && card.community_decks.owner_id !== guard.user.id) {
            const notificationId = crypto.randomUUID()
            await supabase
              .from('notifications')
              .insert({
                id: notificationId,
                user_id: card.community_decks.owner_id,
                type: 'admin_action',
                data: {
                  action: 'card_restored',
                  cardId: itemId,
                  deckId: card.community_deck_id,
                  deckName: card.community_decks.name,
                  cardFront: card.front,
                  message: `A card has been restored in your community deck "${card.community_decks.name}" by a moderator.`
                },
                created_at: new Date().toISOString()
              })
          }

          result = { success: true, itemType: 'card', itemId }
          break
        }

        default:
          return c.json({ error: 'Invalid itemType' }, 400)
      }

      console.log(`✅ Successfully restored ${itemType} ${itemId} (${itemName})`)
      return c.json(result)

    } catch (error) {
      console.error(`❌ Error restoring ${itemType}:`, error)
      return c.json({ 
        error: `Failed to restore ${itemType}`, 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 500)
    }
  })
}