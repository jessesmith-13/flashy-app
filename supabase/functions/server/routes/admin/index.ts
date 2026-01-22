import type { Hono } from 'npm:hono@4'

import { registerAdminUserRoutes } from './users.ts'
import { registerAdminSubscriptionRoutes } from './subscriptions.ts'
import { registerAdminCommunityRoutes } from './community.ts'
import { registerAdminActivityRoutes } from './activity.ts'
import { registerAdminDeletedItemRoutes } from './deletedItems.ts'

export function registerAdminRoutes(app: Hono) {
  registerAdminUserRoutes(app)
  registerAdminSubscriptionRoutes(app)
  registerAdminCommunityRoutes(app)
  registerAdminActivityRoutes(app)
  registerAdminDeletedItemRoutes(app)
}