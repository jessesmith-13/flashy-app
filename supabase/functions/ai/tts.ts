import type { Context, Hono } from 'npm:hono@4'
import { supabase } from './lib/supabase.ts'

export function registerAiTtsRoutes(app: Hono) {
  // AI Text-to-Speech using OpenAI API (Premium feature)
  app.post('/ai/tts', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ TTS: No access token provided')
        return c.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(
          `❌ TTS authentication error: ${authError?.message || 'User not found'}`
        )
        return c.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check premium access
      const tier = user.user_metadata?.subscriptionTier
      const isPremium =
        tier && ['monthly', 'annual', 'lifetime'].includes(tier)

      const isModerator = user.user_metadata?.isModerator === true
      const isSuperuser = user.user_metadata?.isSuperuser === true

      if (!isPremium && !isModerator && !isSuperuser) {
        console.log(`❌ TTS: User ${user.id} lacks premium access`)
        return c.json(
          { error: 'Premium subscription required for OpenAI TTS' },
          { status: 403 }
        )
      }

      const body = await c.req.json<{
        text: string
        language?: string
      }>()

      const { text, language } = body

      if (!text || text.trim().length === 0) {
        console.log('❌ TTS: No text provided')
        return c.json({ error: 'Text is required' }, { status: 400 })
      }

      const voiceMap: Record<string, string> = {
        en: 'alloy',
        es: 'nova',
        fr: 'shimmer',
        de: 'onyx',
        it: 'echo',
        pt: 'fable',
        ru: 'alloy',
        ja: 'shimmer',
        zh: 'nova',
        ko: 'echo',
        ar: 'onyx',
        hi: 'fable',
      }

      const languageCode = (() => {
        if (!language) return 'en'
        const map: Record<string, string> = {
          English: 'en',
          Spanish: 'es',
          French: 'fr',
          German: 'de',
          Italian: 'it',
          Portuguese: 'pt',
          Russian: 'ru',
          Japanese: 'ja',
          Chinese: 'zh',
          Korean: 'ko',
          Arabic: 'ar',
          Hindi: 'hi',
        }
        return map[language] ?? 'en'
      })()

      const voice = voiceMap[languageCode] ?? 'alloy'

      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiApiKey) {
        console.log('❌ TTS: OpenAI API key not configured')
        return c.json(
          { error: 'TTS service not configured' },
          { status: 500 }
        )
      }

      const response = await fetch(
        'https://api.openai.com/v1/audio/speech',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice,
            response_format: 'mp3',
            speed: 0.9,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.log(
          `❌ OpenAI TTS API error: ${response.status} - ${errorText}`
        )
        return c.json(
          { error: 'Failed to generate speech' },
          { status: 500 }
        )
      }

      const audioBuffer = await response.arrayBuffer()
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(audioBuffer))
      )

      return c.json({
        audioData: base64Audio,
        format: 'mp3',
      })
    } catch (error) {
      console.log(`❌ TTS error: ${error}`)
      return c.json(
        { error: 'Failed to generate speech' },
        { status: 500 }
      )
    }
  })
}