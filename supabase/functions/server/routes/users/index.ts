import type { Hono } from 'npm:hono@4'

// Import individual users route registrars
import { registerUserProfileRoutes } from './profile.ts'
import { registerFriendsRoutes } from './friends.ts'
import { registerDecksRoutes } from './decks.ts'
import { registerFixSubscriptionRoutes } from './subscriptions.ts'

export function registerUsersRoutes(app: Hono) {
  registerUserProfileRoutes(app)
  registerFriendsRoutes(app)
  registerDecksRoutes(app)
  registerFixSubscriptionRoutes(app)
}