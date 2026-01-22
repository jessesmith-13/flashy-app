import type { Hono } from 'npm:hono@4'

// Route registrars
import { registerFriendsListRoutes } from './list.ts'
import { registerFriendsRemoveRoutes } from './remove.ts'
import { registerFriendsRequestRoutes } from './requests.ts'

export function registerFriendsRoutes(app: Hono) {
  // ============================================================
  // Friends
  // ============================================================

  registerFriendsListRoutes(app)
  registerFriendsRemoveRoutes(app)
  registerFriendsRequestRoutes(app)
}