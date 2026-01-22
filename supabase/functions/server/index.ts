import { Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import { logger } from "npm:hono@4/logger";

// Route group registrars
import { registerAchievementsRoutes } from "./routes/achievements/index.ts";
import { registerAdminRoutes } from "./routes/admin/index.ts";
import { registerAuthRoutes } from "./routes/auth/index.ts";
import { registerUsersRoutes } from "./routes/users/index.ts";
import { registerDeckRoutes } from "./routes/decks/index.ts";
import { registerCommunityRoutes } from "./routes/community/index.ts";
import { registerModerationRoutes } from "./routes/moderation/index.ts";
import { registerFriendsRoutes } from "./routes/friends/index.ts";
import { registerNotificationsRoutes } from "./routes/notifications/index.ts";
import { registerReferralRoutes } from "./routes/referrals/index.ts";
import { registerStorageRoutes } from "./routes/storage/index.ts";
import { registerStudyRoutes } from "./routes/study/index.ts";
import { registerSupportRoutes } from "./routes/support/index.ts";
import { registerBetaTestingRoutes } from "./routes/betaTesting/index.ts";
import { initializeStorageBuckets } from "./lib/storage.ts";

await initializeStorageBuckets();

console.log("🚀 Flashy API starting (Supabase Edge Functions)");

const app = new Hono().basePath("/server");

app.use("*", async (c, next) => {
  console.log("[HIT]", c.req.method, c.req.path);
  console.log("[HDR origin]", c.req.header("origin"));
  console.log("[HDR apikey?]", !!c.req.header("apikey"));
  console.log(
    "[HDR auth?]",
    (c.req.header("authorization") || "").slice(0, 20)
  );
  await next();
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-test-mode, stripe-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
};

// --------------------------------------------------
// Global middleware
// --------------------------------------------------
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://flashy.app",
      "https://flashy-bptlj2yht-jesses-projects-98ea59e3.vercel.app",
      "https://flashy-app-git-main-jesses-projects-98ea59e3.vercel.app",
      "https://flashy-app-ebon.vercel.app",
    ],
    allowHeaders: [
      "authorization",
      "apikey",
      "content-type",
      "x-client-info",
      "x-test-mode",
      "stripe-signature",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);

app.use("*", logger());

// --------------------------------------------------
// Route registration (domain-based)
// --------------------------------------------------

registerAchievementsRoutes(app);
registerAdminRoutes(app);
registerAuthRoutes(app);
registerUsersRoutes(app);
registerDeckRoutes(app);
registerCommunityRoutes(app);
registerModerationRoutes(app);
registerFriendsRoutes(app);
registerNotificationsRoutes(app);
registerReferralRoutes(app);
registerStorageRoutes(app);
registerStudyRoutes(app);
registerSupportRoutes(app);
registerBetaTestingRoutes(app);

// --------------------------------------------------
// Health check (optional but recommended)
// --------------------------------------------------
app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// --------------------------------------------------
// Local dev server (ONLY runs when executed directly)
// --------------------------------------------------
// if (import.meta.main) {
//   const port = Number(Deno.env.get('PORT') || 8787)
//   console.log(`🧪 Local API server running on http://localhost:${port}`)
//   Deno.serve({ port }, app.fetch)
// }

Deno.serve(async (req) => {
  // Intercept the OPTIONS request immediately at the Deno runtime level
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // Status 204 (No Content) is standard for successful preflights
      headers: CORS_HEADERS, // Attach the headers directly
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
