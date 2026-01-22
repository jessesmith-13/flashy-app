import type { Hono } from 'npm:hono@4'
import type { Context } from 'npm:hono@4'
import { supabase } from './lib/supabase.ts'

export function registerAiTranslateRoutes(app: Hono) {
  // AI Text Translation (Premium only)
  app.post('/ai/translate', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token for AI translation')
        return c.json({ error: 'Missing access token' }, { status: 401 })
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error in AI translate: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check subscription tier (from user metadata)
      const subscriptionTier = user.user_metadata?.subscriptionTier ?? 'free'
      if (subscriptionTier === 'free') {
        console.log(`❌ Free user ${user.id} attempted translation - blocked`)
        return c.json(
          { error: 'Translation requires a Premium or Pro subscription' },
          { status: 403 }
        )
      }

      const body = await c.req.json<{
        text: string
        targetLanguage: string
      }>()

      const { text, targetLanguage } = body

      if (!text || !targetLanguage) {
        console.log('❌ Missing required fields: text or targetLanguage')
        return c.json(
          { error: 'Text and target language are required' },
          { status: 400 }
        )
      }

      console.log(`🌐 AI Translate request:`)
      console.log(`   User: ${user.id}`)
      console.log(`   Subscription: ${subscriptionTier}`)
      console.log(`   Target Language: ${targetLanguage}`)
      console.log(`   Text length: ${text.length} characters`)

      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiApiKey) {
        console.log('❌ OpenAI API key not configured')
        return c.json(
          { error: 'AI service not configured. Please add your OpenAI API key.' },
          { status: 500 }
        )
      }

      const openaiResponse = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a professional translator. Translate the given text to ${targetLanguage}. Provide ONLY the translation, with no explanations, quotes, or additional text. Preserve the original meaning and tone as closely as possible.`,
              },
              {
                role: 'user',
                content: text,
              },
            ],
            temperature: 0.3,
          }),
        }
      )

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text()
        console.log(
          `❌ OpenAI API error: ${openaiResponse.status} - ${errorData}`
        )
        return c.json(
          { error: 'Translation service error' },
          { status: 500 }
        )
      }

      const data = await openaiResponse.json()
      const translatedText: string | undefined =
        data.choices?.[0]?.message?.content?.trim()

      if (!translatedText) {
        console.log('❌ No translation received from OpenAI')
        return c.json(
          { error: 'Failed to generate translation' },
          { status: 500 }
        )
      }

      console.log(`✅ Translation successful`)

      return c.json({ translatedText })
    } catch (error) {
      console.log(`❌ AI translation error: ${error}`)
      return c.json(
        { error: 'Failed to translate text' },
        { status: 500 }
      )
    }
  })
}