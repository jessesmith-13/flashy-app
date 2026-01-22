/// <reference lib="deno.ns" />

import { Hono } from 'npm:hono@4'
import { cors } from 'npm:hono@4/cors'
import { logger } from 'npm:hono@4/logger'

import { registerSubscriptionPaymentRoutes } from './routes/payments.ts'
import { registerSubscriptionPlanRoutes } from './routes/plans.ts'

const app = new Hono().basePath('/stripe')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-test-mode, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
};

// --------------------------------------------------
// Global middleware
// --------------------------------------------------
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://flashy.app',
      'https://flashy-bptlj2yht-jesses-projects-98ea59e3.vercel.app',
      'https://flashy-app-git-main-jesses-projects-98ea59e3.vercel.app',
      'https://flashy-app-ebon.vercel.app'
    ],
    allowHeaders: [
      "authorization",
      "apikey",
      "content-type",
      "x-client-info",
      "x-test-mode",
      "stripe-signature",
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
)

app.use('*', logger())

// --------------------------------------------------
// Route registration (domain-based)
// --------------------------------------------------

  registerSubscriptionPaymentRoutes(app)
  registerSubscriptionPlanRoutes(app)


Deno.serve(async (req) => {
  // Intercept the OPTIONS request immediately at the Deno runtime level
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // Status 204 (No Content) is standard for successful preflights
      headers: CORS_HEADERS // Attach the headers directly
    });
  }
  
  // For all other requests (GET, POST, etc.), use the Hono app to route them
  const response = await app.fetch(req);
  
  // Optional: Manually ensure the main response also has the CORS headers if Hono middleware misses any
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    // Overwrite any existing headers if necessary
    response.headers.set(key, value); 
  }
  
  return response;
});