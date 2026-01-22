import type { Hono } from 'npm:hono@4'
import { registerAvatarRoutes } from './avatar.ts'
import { registerCardImageRoutes } from './cardImage.ts'
import { registerCardAudioRoutes } from './cardAudio.ts'

export function registerStorageRoutes(app: Hono) {
  registerAvatarRoutes(app)
  registerCardImageRoutes(app)
  registerCardAudioRoutes(app)
}