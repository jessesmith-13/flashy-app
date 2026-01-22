import type { Hono } from 'npm:hono@4'

import { registerPersonalDeckRoutes } from './personal.ts'
import { registerCardsRoutes } from './cards.ts'
import { registerCommunityDeckRoutes } from './community.ts'
import { registerDeckSharingRoutes } from './sharing.ts'

export function registerDeckRoutes(app: Hono) {
  registerPersonalDeckRoutes(app)
  registerCardsRoutes(app)
  registerCommunityDeckRoutes(app)
  registerDeckSharingRoutes(app)
}