import type { Hono } from 'npm:hono@4'

// Import individual auth route registrars
import { registerSignupRoutes } from './signup.ts'
import { registerLoginRoutes } from './login.ts'
import { registerCheckDisplayNameRoutes } from './checkDisplayName.ts'
import { registerTermsAcceptRoutes } from './termsAccept.ts'
// import { registerOAuthRoutes } from './oauth'
// import { registerPasswordResetRoutes } from './passwordReset'

export function registerAuthRoutes(app: Hono) {
  registerSignupRoutes(app)
  registerLoginRoutes(app)
  registerCheckDisplayNameRoutes(app)
  registerTermsAcceptRoutes(app)
  // registerOAuthRoutes(app)
  // registerPasswordResetRoutes(app)
}