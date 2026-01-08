const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL is missing')
}

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`

export const API_BASE = `${FUNCTIONS_BASE}/server`
export const AI_API_BASE = `${FUNCTIONS_BASE}/ai`
export const STRIPE_API_BASE = `${FUNCTIONS_BASE}/stripe`