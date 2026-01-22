import { createClient } from '@supabase/supabase-js'

export function createUserClient(accessToken: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!

  return createClient(
    supabaseUrl,
    accessToken,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )
}