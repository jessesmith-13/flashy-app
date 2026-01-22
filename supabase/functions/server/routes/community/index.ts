import type { Hono } from 'npm:hono@4'

import { registerCommunityAddDeckRoutes } from './addDeck.ts'
import { registerCommunityDeckRoutes } from './decks.ts'
import { registerCommunityFeaturedRoutes } from './featured.ts'
import { registerCommunityUsersRoutes } from './users.ts'
import { registerCommunityRatingsRoutes } from './ratings.ts'
import { registerCommunityCommentsRoutes } from './comments.ts'

export function registerCommunityRoutes(app: Hono) {
  registerCommunityAddDeckRoutes(app)
  registerCommunityFeaturedRoutes(app)
  registerCommunityDeckRoutes(app)
  registerCommunityUsersRoutes(app)
  registerCommunityRatingsRoutes(app)
  registerCommunityCommentsRoutes(app)
}