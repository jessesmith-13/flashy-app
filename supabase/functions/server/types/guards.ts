import type { AuthUser } from './auth.ts'

export type GuardResult =
  | {
      ok: true
      user: AuthUser
    }
  | {
      ok: false
      response: Response
    }