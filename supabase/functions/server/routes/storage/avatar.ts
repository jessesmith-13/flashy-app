import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { STORAGE_BUCKETS } from '../../lib/storage.ts'
import { fileToUint8Array } from '../../lib/storageUpload.ts'

export function registerAvatarRoutes(app: Hono) {
  app.post('/storage/avatar', async c => {
    const token = c.req.header('Authorization')?.split(' ')[1]
    if (!token) return c.json({ error: 'Unauthorized' }, 401)

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.parseBody()
    const file = body.file as File | undefined
    if (!file) return c.json({ error: 'No file provided' }, 400)

    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      return c.json({ error: 'Invalid image type' }, 400)
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File too large (5MB max)' }, 400)
    }

    const ext = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${ext}`

    const bytes = await fileToUint8Array(file)

    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.avatars)
      .upload(fileName, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (error) return c.json({ error: error.message }, 400)

    const { data } = supabase.storage
      .from(STORAGE_BUCKETS.avatars)
      .getPublicUrl(fileName)

    return c.json({ url: data.publicUrl })
  })
}