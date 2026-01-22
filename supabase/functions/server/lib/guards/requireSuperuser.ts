import type { Context } from 'npm:hono@4'
import { supabase } from '../supabase.ts'
import type { GuardResult } from '../../types/guards.ts'

export async function requireSuperuser(
  c: Context
): Promise<GuardResult> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1]

  if (!accessToken) {
    return {
      ok: false,
      response: c.json({ error: 'Missing access token' }, 401),
    }
  }

  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error || !data.user) {
    return {
      ok: false,
      response: c.json({ error: 'Unauthorized' }, 401),
    }
  }

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('is_superuser')
    .eq('id', data.user.id)
    .single()

  if (dbError || !dbUser?.is_superuser) {
    return {
      ok: false,
      response: c.json({ error: 'Forbidden' }, 403),
    }
  }

  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  }
}