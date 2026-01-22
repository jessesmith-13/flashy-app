import { createClient } from '@supabase/supabase-js'

const url = Deno.env.get("SUPABASE_URL")!
const anon = Deno.env.get("SUPABASE_ANON_KEY")!

export async function requireUserId(c: any): Promise<string> {
  const authHeader = c.req.header("Authorization") ?? ""
  const token = authHeader.split(" ")[1]
  if (!token) throw new Response(JSON.stringify({ error: "Missing access token" }), { status: 401 })

  const supaUser = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data, error } = await supaUser.auth.getUser()
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  return data.user.id
}