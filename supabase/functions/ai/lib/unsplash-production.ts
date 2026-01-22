/**
 * Unsplash Production API
 * Implements all requirements for Unsplash API production access
 *
 * Production Requirements:
 * 1. ✅ Hotlink photos from Unsplash CDN
 * 2. ✅ Trigger download endpoint when user uses image
 * 3. ✅ Proper attribution (photographer name + Unsplash link)
 * 4. ✅ No brand confusion
 */

const UNSPLASH_API_URL = "https://api.unsplash.com";
const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");

// Rate limiting: Add delay between requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Attribution data required by Unsplash guidelines
 */
export interface UnsplashAttribution {
  photographerName: string;
  photographerUsername: string;
  photographerUrl: string;
  unsplashUrl: string;
  downloadUrl: string; // Used to trigger download tracking
}

/**
 * Enhanced image result with attribution
 */
export interface UnsplashImageResult {
  imageUrl: string;
  attribution: UnsplashAttribution;
}

/**
 * Wait to respect rate limits
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏳ Rate limit: waiting ${waitTime}ms before next request...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Search Unsplash for an image with full attribution data
 * Returns image URL + attribution or null if not found
 */
export async function searchUnsplashImageWithAttribution(
  query: string
): Promise<UnsplashImageResult | null> {
  // If no API key, skip
  if (!UNSPLASH_ACCESS_KEY) {
    console.log("ℹ️ Unsplash API key not set - skipping image search");
    return null;
  }

  // Wait to respect rate limits
  await waitForRateLimit();

  try {
    console.log(`🔍 Searching Unsplash for: "${query}"`);

    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403) {
        console.error(
          `❌ Unsplash API Rate Limit (403): You've hit the hourly limit. Free tier = 50 requests/hour.`
        );
        return null;
      }
      console.error(`❌ Unsplash API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const photo = data.results[0];

      // Extract all required attribution data
      const result: UnsplashImageResult = {
        imageUrl: photo.urls.regular, // 1080px wide
        attribution: {
          photographerName: photo.user.name,
          photographerUsername: photo.user.username,
          photographerUrl: photo.user.links.html,
          unsplashUrl: photo.links.html,
          downloadUrl: photo.links.download_location, // This endpoint MUST be called when image is used
        },
      };

      console.log(
        `✅ Found image by ${result.attribution.photographerName}: ${result.imageUrl}`
      );
      return result;
    }

    // 🔄 FALLBACK: If no results, try a broader search
    console.log(`⚠️ No results for "${query}", trying fallback searches...`);

    const words = query.split(" ").filter((w) => w.length > 0);

    if (words.length > 1) {
      // Fallback 1: Remove first word
      const fallback1 = words.slice(1).join(" ");
      console.log(`🔄 Fallback 1: "${fallback1}"`);

      await waitForRateLimit();

      const fallbackResponse1 = await fetch(
        `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
          fallback1
        )}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (fallbackResponse1.ok) {
        const fallbackData1 = await fallbackResponse1.json();
        if (fallbackData1.results && fallbackData1.results.length > 0) {
          const photo = fallbackData1.results[0];
          const result: UnsplashImageResult = {
            imageUrl: photo.urls.regular,
            attribution: {
              photographerName: photo.user.name,
              photographerUsername: photo.user.username,
              photographerUrl: photo.user.links.html,
              unsplashUrl: photo.links.html,
              downloadUrl: photo.links.download_location,
            },
          };
          console.log(
            `✅ Found image with fallback 1 by ${result.attribution.photographerName}`
          );
          return result;
        }
      } else if (fallbackResponse1.status === 403) {
        console.error(`❌ Unsplash API Rate Limit (403) on fallback 1`);
        return null;
      }

      // Fallback 2: Last word only
      const fallback2 = words[words.length - 1];
      console.log(`🔄 Fallback 2: "${fallback2}"`);

      await waitForRateLimit();

      const fallbackResponse2 = await fetch(
        `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
          fallback2
        )}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (fallbackResponse2.ok) {
        const fallbackData2 = await fallbackResponse2.json();
        if (fallbackData2.results && fallbackData2.results.length > 0) {
          const photo = fallbackData2.results[0];
          const result: UnsplashImageResult = {
            imageUrl: photo.urls.regular,
            attribution: {
              photographerName: photo.user.name,
              photographerUsername: photo.user.username,
              photographerUrl: photo.user.links.html,
              unsplashUrl: photo.links.html,
              downloadUrl: photo.links.download_location,
            },
          };
          console.log(
            `✅ Found image with fallback 2 by ${result.attribution.photographerName}`
          );
          return result;
        }
      } else if (fallbackResponse2.status === 403) {
        console.error(`❌ Unsplash API Rate Limit (403) on fallback 2`);
        return null;
      }
    }

    console.log(
      `ℹ️ No image found for query: "${query}" (even with fallbacks)`
    );
    return null;
  } catch (error) {
    console.error(`❌ Error searching Unsplash:`, error);
    return null;
  }
}

/**
 * Trigger download event (REQUIRED by Unsplash guidelines)
 * Must be called when user actually uses/saves the image
 */
export async function triggerUnsplashDownload(
  downloadUrl: string
): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log("ℹ️ Unsplash API key not set - skipping download trigger");
    return;
  }

  try {
    console.log(`📥 Triggering Unsplash download event...`);

    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (response.ok) {
      console.log(`✅ Successfully triggered download event`);
    } else {
      console.error(`⚠️ Failed to trigger download event: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Error triggering download event:`, error);
  }
}

/**
 * Check if a card should get an image (helper function)
 */
export function shouldAddImage(front: string, back: string): boolean {
  const combinedText = `${front} ${back}`.toLowerCase();

  // Skip images for very short text
  if (combinedText.replace(/\s/g, "").length < 10) {
    return false;
  }

  // Skip images for purely mathematical content
  if (/^[\d\s+\-*/=()]+$/.test(combinedText)) {
    return false;
  }

  // Skip images for music chords/notes (they use audio)
  if (
    /(major|minor|diminished|augmented|chord|note|c#|d#|e#|f#|g#|a#|b#)/i.test(
      combinedText
    )
  ) {
    return false;
  }

  return true;
}
