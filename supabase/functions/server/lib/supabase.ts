import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('❌ Missing Supabase environment variables')
}

/**
 * ⚠️ SERVICE ROLE CLIENT
 * - Bypasses RLS
 * - Use ONLY inside Edge Functions
 * - NEVER expose to the client
 */
export const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)