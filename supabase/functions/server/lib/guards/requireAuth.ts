import type { Context } from 'npm:hono@4'
import { supabase } from '../supabase.ts'
import type { User } from '../../types/users.ts'

export async function requireAuth(c: Context):
  Promise<{ user: User } | { error: Response }> {

  const token = c.req.header('Authorization')?.split(' ')[1]
  if (!token) {
    return { error: c.json({ error: 'Unauthorized' }, 401) }
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { error: c.json({ error: 'Unauthorized' }, 401) }
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single<User>()

  if (!dbUser) {
    return { error: c.json({ error: 'Unauthorized' }, 401) }
  }

  return { user: dbUser }
}