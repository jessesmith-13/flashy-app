import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { STORAGE_BUCKETS } from '../../lib/storage.ts'
import { fileToUint8Array } from '../../lib/storageUpload.ts'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

export function registerCardImageRoutes(app: Hono) {
  app.post('/storage/card-image', async c => {
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

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return c.json(
          { error: 'Invalid file type. Only image files are allowed.' },
          400
        )
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return c.json(
          { error: 'File too large. Maximum size is 5MB.' },
          400
        )
      }

      // ------------------------------------------------------------
      // Upload
      // ------------------------------------------------------------
      const extension = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${extension}`

      const fileBytes = await fileToUint8Array(file)

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.cardImages)
        .upload(fileName, fileBytes, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        return c.json({ error: uploadError.message }, 400)
      }

      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.cardImages)
        .getPublicUrl(fileName)

      return c.json({ url: data.publicUrl })
    } catch (error) {
      console.error('❌ Upload card image exception:', error)
      return c.json({ error: 'Failed to upload card image' }, 500)
    }
  })
}