import type { Context } from 'npm:hono@4'
import type { ContentfulStatusCode } from 'npm:hono/utils/http-status'
import { corsHeaders } from './cors.ts'

export function jsonWithCors<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200
) {
  return c.json(data, status, corsHeaders)
}