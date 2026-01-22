import type { Hono } from 'npm:hono@4'
import type { Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { toCamelCase } from "../../lib/utils/case.ts"

type ShareRequestBody = {
  isCommunityDeck?: boolean
}

type SharedDeckSnapshot = {
  name: string
  emoji: string
  color: string
  category: string | null
  subtopic: string | null
  difficulty: string | null
  authorName: string
  cards: unknown[] // snapshot payload; intentionally flexible
}

export function registerDeckSharingRoutes(app: Hono) {

  // ------------------------------------------------------------
  // Create shareable link for a deck (snapshot-based)
  // ------------------------------------------------------------
app.post('/decks/:deckId/share', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in create share link: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')

    // Get the deck from database
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()

    if (deckError || !deck) {
      console.log(`Share deck error: Deck not found for deckId=${deckId}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Get the cards for this deck
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })

    if (cardsError) {
      console.log(`Error fetching cards for share: ${cardsError.message}`)
      return c.json({ error: 'Failed to fetch cards' }, 500)
    }

    // Generate a unique share ID
    const shareId = crypto.randomUUID()

    // Get user display name
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const authorName = userProfile?.display_name || 'Anonymous'

    // Format cards for deck_data (convert snake_case to camelCase)
    const formattedCards = (cards || []).map((card: any) => ({
      id: card.id,
      cardType: card.card_type,
      front: card.front,
      back: card.back,
      correctAnswers: card.correct_answers,
      incorrectAnswers: card.incorrect_answers,
      acceptedAnswers: card.accepted_answers,
      position: card.position,
    }))

    // Create the deck_data object
    const deckData = {
      name: deck.name,
      emoji: deck.emoji,
      color: deck.color,
      deckType: deck.deck_type,
      category: deck.category,
      subtopic: deck.subtopic,
      difficulty: deck.difficulty,
      authorName: authorName,
      cards: formattedCards,
    }

    // Store the shared deck in database with deck_data
    const { error: insertError } = await supabase
      .from('shared_decks')
      .insert({
        id: shareId,
        deck_id: deckId,
        created_by: user.id,
        deck_data: deckData,
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.log(`Error creating shared deck: ${insertError.message}`)
      return c.json({ error: 'Failed to create share link' }, 500)
    }

    console.log(`✅ Created share link: ${shareId} for deck: ${deck.name}`)

    return c.json({ shareId, shareUrl: `/shared/${shareId}` })
  } catch (error) {
    console.log(`Create share link error: ${error}`)
    return c.json({ error: 'Failed to create share link' }, 500)
  }
})

  // ------------------------------------------------------------
  // Get a shared deck by share ID
  // ------------------------------------------------------------
  app.get('/decks/shared/:shareId', async (c: Context) => {
    try {
      const shareId = c.req.param('shareId')

      const { data, error } = await supabase
        .from('shared_decks')
        .select('id, deck_data, created_at')
        .eq('id', shareId)
        .single()

      if (error || !data) {
        return c.json({ error: 'Shared deck not found' }, 404)
      }

      return c.json({
        shareId: data.id,
        deck: toCamelCase(data.deck_data),
        createdAt: data.created_at,
      })
    } catch (error) {
      console.error('Get shared deck error:', error)
      return c.json({ error: 'Failed to fetch shared deck' }, 500)
    }
  })

  // Add a shared deck to user's library
app.post('/shared/:shareId/add', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in add shared deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const shareId = c.req.param('shareId')
    
    // Get the shared deck
    const { data: sharedDeck, error: deckError } = await supabase
      .from('shared_decks')
      .select('*')
      .eq('id', shareId)
      .single()

    if (deckError || !sharedDeck) {
      return c.json({ error: 'Shared deck not found' }, 404)
    }

    const deckData = sharedDeck.deck_data

    console.log('📥 Adding shared deck to library:', {
      shareId,
      userId: user.id,
      deckName: deckData.name,
    })

    // Check if user already has this shared deck
    const { data: existingDecks, error: checkError } = await supabase
      .from('decks')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('id', sharedDeck.deck_id)

    if (checkError) {
      console.error('Error checking for existing deck:', checkError)
      return c.json({ error: 'Failed to check existing deck' }, 500)
    }

    if (existingDecks && existingDecks.length > 0) {
      return c.json({ error: 'You have already added this deck to your library' }, 400)
    }

    // Get user's current deck count for position
    const { data: userDecks, error: countError } = await supabase
      .from('decks')
      .select('id')
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting user decks:', countError)
      return c.json({ error: 'Failed to count user decks' }, 500)
    }

    const position = userDecks?.length || 0

    // Create the new deck
    const newDeckId = crypto.randomUUID()
    const now = new Date().toISOString()

    const { data: newDeck, error: createDeckError } = await supabase
      .from('decks')
      .insert({
        id: newDeckId,
        user_id: user.id,
        name: deckData.name,
        emoji: deckData.emoji || '📚',
        color: deckData.color || '#10B981',
        deck_type: deckData.deckType || 'classic-flip',
        category: deckData.category || null,
        subtopic: deckData.subtopic || null,
        difficulty: deckData.difficulty || null,
        position,
        created_at: now,
        updated_at: now,
        content_updated_at: now,
        is_shared: true,
      })
      .select()
      .single()

    if (createDeckError) {
      console.error('Error creating deck:', createDeckError)
      return c.json({ error: 'Failed to create deck' }, 500)
    }

    console.log('✅ Created new deck from shared deck:', newDeckId)

    // Copy all the cards from deck_data
    const cards = deckData.cards || []
    console.log(`CARDS`, cards)
    
    if (cards.length > 0) {
      const cardsToInsert = cards.map((card: any, index: number) => ({
        deck_id: newDeckId,
        card_type: card.cardType,
        front: card.front,
        back: card.back,
        correct_answers: card.correctAnswers,
        incorrect_answers: card.incorrectAnswers,
        accepted_answers: card.acceptedAnswers,
        position: card.position !== undefined ? card.position : index,
        created_at: now,
      }))

      const { error: insertCardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert)

      if (insertCardsError) {
        console.error('Error creating cards:', insertCardsError)
        // Clean up the deck if card creation fails
        await supabase.from('decks_8a1502a9').delete().eq('id', newDeckId)
        return c.json({ error: 'Failed to copy cards' }, 500)
      }

      console.log(`✅ Copied ${cardsToInsert.length} cards to new deck`)
    }

    // Return the created deck with camelCase fields
    const deckResponse = {
      id: newDeck.id,
      userId: newDeck.user_id,
      name: newDeck.name,
      emoji: newDeck.emoji,
      color: newDeck.color,
      deckType: newDeck.deck_type,
      category: newDeck.category,
      subtopic: newDeck.subtopic,
      difficulty: newDeck.difficulty,
      position: newDeck.position,
      cardCount: cards.length,
      createdAt: newDeck.created_at,
      updatedAt: newDeck.updated_at,
      contentUpdatedAt: newDeck.content_updated_at,
      isFavorite: false,
      isLearned: false,
      isPublished: false,
      deleted: false,
    }

    console.log('✅ Successfully added shared deck to library')

    return c.json({ 
      message: 'Deck added to your library successfully',
      deck: deckResponse 
    })

  } catch (error) {
    console.log(`Add shared deck error: ${error}`)
    return c.json({ error: 'Failed to add shared deck to library' }, 500)
  }
})
}