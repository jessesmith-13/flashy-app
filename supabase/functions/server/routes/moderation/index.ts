import type { Hono } from 'npm:hono@4'

// Import route registrars
import { registerCommentsRoutes } from './comments.ts'
import { registerFlagRoutes } from './flags.ts'
import { registerTicketRoutes } from './tickets.ts'
import { registerWarningsRoutes } from './warnings.ts'

/**
 * Registers all moderation-related routes:
 * - comments
 * - flags
 * - tickets
 * - warnings
 */
export function registerModerationRoutes(app: Hono) {
  registerCommentsRoutes(app)
  registerFlagRoutes(app)
  registerTicketRoutes(app)
  registerWarningsRoutes(app)
}