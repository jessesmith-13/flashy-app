// ========================================
// AI PDF GENERATION (CLIENT-SIDE PARSING)
// ========================================
// This endpoint receives pre-extracted text from the frontend
// No PDF parsing library needed - keeps edge function small!

import { Hono } from 'npm:hono@4'
import { supabase } from './lib/supabase.ts'


type CardType = 'classic-flip' | 'multiple-choice' | 'type-answer'

type GeneratedCard = {
  front: string
  back: string
  cardType: CardType
  correctAnswers?: string[]
  incorrectAnswers?: string[]
  acceptedAnswers?: string[]
}

export function registerAiPdfRoutes(app: Hono) {

// ========================================
// GENERATE CARDS FROM PDF TEXT
// POST /ai/generate/pdf-text
// ========================================

  app.post('/ai/generate/pdf-text', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`Auth error in PDF text generation: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check subscription tier from database
      const { data: userProfile } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      const subscriptionTier = userProfile?.subscription_tier || 'free'

      if (subscriptionTier === 'free') {
        return c.json(
          { error: 'PDF import with AI requires a Premium or Pro subscription' },
          403
        )
      }

      // Parse request body
      const body = await c.req.json()
      const {
        pdfText,
        numCards,
        customInstructions,
        cardTypes,
        frontLanguage,
        backLanguage,
      } = body

      // Validate PDF text
      if (!pdfText || typeof pdfText !== 'string' || !pdfText.trim()) {
        return c.json({ error: 'No PDF text provided' }, 400)
      }

      if (pdfText.length > 100_000) {
        return c.json(
          { error: 'PDF text is too long. Maximum 100,000 characters.' },
          400
        )
      }

      // Validate card count
      const cardCount = Number(numCards ?? 15)
      if (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > 100) {
        return c.json(
          { error: 'Number of cards must be between 1 and 100' },
          400
        )
      }

      // Parse card types
      const selectedTypes: CardType[] = []
      if (cardTypes?.classicFlip) selectedTypes.push('classic-flip')
      if (cardTypes?.multipleChoice) selectedTypes.push('multiple-choice')
      if (cardTypes?.typeAnswer) selectedTypes.push('type-answer')
      if (selectedTypes.length === 0) selectedTypes.push('classic-flip')

      console.log(`🎯 Generating ${cardCount} cards from PDF text (${pdfText.length} chars)`)

      // Get OpenAI API key
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiApiKey) {
        return c.json({ error: 'AI service not configured' }, 500)
      }

      // Add buffer cards to account for potential invalid responses
      const bufferCount = Math.max(3, Math.ceil(cardCount * 0.2))
      const paddedCardCount = cardCount + bufferCount

      // Calculate card type distribution
      const numSelectedTypes = selectedTypes.length
      const cardsPerType = Math.floor(paddedCardCount / numSelectedTypes)

      let distributionText = ''
      if (numSelectedTypes === 1) {
        distributionText = `Generate ALL ${paddedCardCount} cards as "${selectedTypes[0]}" type.`
      } else if (numSelectedTypes === 2) {
        distributionText = `Split evenly: ~${cardsPerType} cards of "${selectedTypes[0]}" and ~${cardsPerType} cards of "${selectedTypes[1]}".`
      } else {
        distributionText = `Split evenly: ~${cardsPerType} cards of each type (${selectedTypes.join(', ')}).`
      }

      // Build system prompt based on card types
      let cardTypeInstructions = ''
      if (selectedTypes.includes('multiple-choice')) {
        cardTypeInstructions += `
  - For multiple-choice cards: Include "correctAnswers" (array of correct options) and "incorrectAnswers" (array of 3 wrong options).`
      }
      if (selectedTypes.includes('type-answer')) {
        cardTypeInstructions += `
  - For type-answer cards: Include "acceptedAnswers" (array of alternative spellings/answers).`
      }

      const systemPrompt = `You are an expert educational content creator specializing in flashcard generation.

  Generate EXACTLY ${paddedCardCount} high-quality flashcards from the provided document.

  CARD TYPE DISTRIBUTION:
  ${distributionText}
  Mix these types throughout the deck in the specified proportions.

  Each card MUST include:
  - "front" (string): The question/prompt
  - "back" (string): The answer/explanation
  - "cardType" (string): One of: ${selectedTypes.join(', ')}
  ${cardTypeInstructions}

  ${frontLanguage ? `- Front side language: ${frontLanguage}` : ''}
  ${backLanguage ? `- Back side language: ${backLanguage}` : ''}

  Return valid JSON in this exact format:
  {
    "cards": [
      {
        "front": "question here",
        "back": "answer here",
        "cardType": "classic-flip"
      }
    ]
  }

  Focus on:
  - Key concepts and definitions
  - Important facts and details
  - Cause and effect relationships
  - Examples and applications
  - Clear, concise questions and answers`

      const userPrompt = `${customInstructions ? `Special instructions: ${customInstructions}\n\n` : ''}Document content:\n\n${pdfText}`

      // Call OpenAI
      console.log(`🤖 Calling OpenAI API (model: ${cardCount > 50 ? 'gpt-4o' : 'gpt-4o-mini'})`)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: cardCount > 50 ? 'gpt-4o' : 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
          max_tokens: Math.min(16384, paddedCardCount * 200),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ OpenAI API error: ${errorText}`)
        return c.json(
          {
            error: 'AI generation failed',
            details: response.status === 429 ? 'Rate limit exceeded' : errorText,
          },
          response.status === 429 ? 429 : 500
        )
      }

      const data = await response.json()
      let content: { cards: GeneratedCard[] }

      try {
        content = JSON.parse(data.choices[0].message.content)
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError)
        return c.json({ error: 'AI returned malformed JSON. Please try again.' }, 500)
      }

      if (!Array.isArray(content.cards)) {
        console.error('❌ AI response missing cards array')
        return c.json({ error: 'Invalid AI response format' }, 500)
      }

      // Validate and filter cards
      let validCards = content.cards.filter((card): card is GeneratedCard => {
        const hasBasicFields =
          typeof card.front === 'string' &&
          typeof card.back === 'string' &&
          card.front.trim() !== '' &&
          card.back.trim() !== ''

        if (!hasBasicFields) return false

        // Validate card type specific fields
        if (card.cardType === 'multiple-choice') {
          return (
            Array.isArray(card.correctAnswers) &&
            Array.isArray(card.incorrectAnswers) &&
            card.correctAnswers.length > 0 &&
            card.incorrectAnswers.length >= 3
          )
        }

        if (card.cardType === 'type-answer') {
          return Array.isArray(card.acceptedAnswers) && card.acceptedAnswers.length > 0
        }

        return true
      })

      console.log(`✅ Generated ${validCards.length} valid cards (requested: ${cardCount})`)

      // Check if we have enough valid cards
      const minAcceptable = Math.max(1, Math.ceil(cardCount * 0.7))
      if (validCards.length < minAcceptable) {
        return c.json(
          {
            error: `Only ${validCards.length} valid cards could be generated from the PDF. Try simplifying your instructions or providing a different document.`,
          },
          400
        )
      }

      // Trim to requested count
      if (validCards.length > cardCount) {
        validCards = validCards.slice(0, cardCount)
      }

      return c.json({
        cards: validCards,
        metadata: {
          requested: cardCount,
          generated: validCards.length,
          textLength: pdfText.length,
        },
      })
    } catch (error) {
      console.error('❌ PDF text generation error:', error)
      return c.json(
        {
          error: 'Failed to generate cards from PDF',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  })
}
