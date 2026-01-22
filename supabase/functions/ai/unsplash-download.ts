/**
 * Unsplash Download Tracking Endpoint
 * Triggers download events when users save cards with Unsplash images
 *
 * CRITICAL: This endpoint MUST be called whenever a user saves/uses an Unsplash image
 * This is required by Unsplash's production API guidelines
 */

import { Hono } from "npm:hono";
import { triggerUnsplashDownload } from "./lib/unsplash-production.ts";

export function registerUnsplashDownloadRoutes(app: Hono) {
  /**
   * POST /ai/unsplash/download
   * Trigger download event for Unsplash image usage
   *
   * Body: { downloadUrl: string }
   */
  app.post("/ai/unsplash/download", async (c) => {
    try {
      const { downloadUrl } = await c.req.json();

      if (!downloadUrl) {
        return c.json({ error: "downloadUrl is required" }, 400);
      }

      // Trigger the download event (required by Unsplash)
      await triggerUnsplashDownload(downloadUrl);

      return c.json({ success: true });
    } catch (error) {
      console.error("❌ Error in unsplash/download endpoint:", error);
      return c.json({ error: "Failed to trigger download event" }, 500);
    }
  });

  /**
   * POST /ai/unsplash/download-batch
   * Trigger download events for multiple Unsplash images at once
   *
   * Body: { downloadUrls: string[] }
   */
  app.post("/ai/unsplash/download-batch", async (c) => {
    try {
      const { downloadUrls } = await c.req.json();

      if (!downloadUrls || !Array.isArray(downloadUrls)) {
        return c.json({ error: "downloadUrls array is required" }, 400);
      }

      console.log(
        `📥 Triggering ${downloadUrls.length} Unsplash download events...`
      );

      // Trigger all download events
      await Promise.all(
        downloadUrls.map((url) => triggerUnsplashDownload(url))
      );

      return c.json({ success: true, count: downloadUrls.length });
    } catch (error) {
      console.error("❌ Error in unsplash/download-batch endpoint:", error);
      return c.json({ error: "Failed to trigger download events" }, 500);
    }
  });
}
