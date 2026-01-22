import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { STORAGE_BUCKETS } from '../../lib/storage.ts'
import { fileToUint8Array } from '../../lib/storageUpload.ts'

const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
]

const ALLOWED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.webm',
]

export function registerCardAudioRoutes(app: Hono) {
  app.post('/storage/card-audio', async c => {
    try {
      // ------------------------------------------------------------
      // Auth
      // ------------------------------------------------------------
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // ------------------------------------------------------------
      // Parse + validate file
      // ------------------------------------------------------------
      const body = await c.req.parseBody()
      const file = body.file as File | undefined

      if (!file) {
        return c.json({ error: 'No file provided' }, 400)
      }

      const extension = '.' + file.name.split('.').pop()?.toLowerCase()

      const validMime =
        ALLOWED_AUDIO_MIME_TYPES.includes(file.type)

      const validExt =
        ALLOWED_AUDIO_EXTENSIONS.includes(extension)

      if (!validMime && !validExt) {
        return c.json(
          { error: 'Invalid audio format. Supported: mp3, wav, m4a, ogg, webm.' },
          400
        )
      }

      if (file.size > MAX_AUDIO_SIZE) {
        return c.json(
          { error: 'File too large. Maximum size is 10MB.' },
          400
        )
      }

      // ------------------------------------------------------------
      // Upload
      // ------------------------------------------------------------
      const fileName = `${user.id}-${Date.now()}${extension}`

      const fileBytes = await fileToUint8Array(file)

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.cardAudio)
        .upload(fileName, fileBytes, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        return c.json({ error: uploadError.message }, 400)
      }

      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.cardAudio)
        .getPublicUrl(fileName)

      return c.json({ url: data.publicUrl })
    } catch (error) {
      console.error('❌ Upload card audio exception:', error)
      return c.json({ error: 'Failed to upload card audio' }, 500)
    }
  })
}