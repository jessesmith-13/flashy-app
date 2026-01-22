/**
 * Unsplash Image Search
 * Searches for stock photos to add to flashcards
 */

const UNSPLASH_API_URL = "https://api.unsplash.com";
const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");

/**
 * Search Unsplash for an image
 * Returns image URL or null if not found
 */
export async function searchUnsplashImage(
  query: string
): Promise<string | null> {
  // If no API key, skip (not required for basic functionality)
  if (!UNSPLASH_ACCESS_KEY) {
    console.log("ℹ️ Unsplash API key not set - skipping image search");
    return null;
  }

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
      console.error(`❌ Unsplash API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].urls.regular; // 1080px wide
      console.log(`✅ Found image: ${imageUrl}`);
      return imageUrl;
    }

    console.log(`ℹ️ No image found for query: "${query}"`);
    return null;
  } catch (error) {
    console.error(`❌ Error searching Unsplash:`, error);
    return null;
  }
}

/**
 * Extract keywords from card content for image search
 * @param text - The text to extract keywords from (card front or back)
 */
export function extractImageKeywords(text: string): string {
  // Remove common question words and clean text
  const cleaned = text
    .toLowerCase()
    .replace(/\?|!|\.|,|;/g, "") // Remove punctuation
    .replace(
      /what is|what are|who is|who are|where is|where are|when is|when are|how|why|which/gi,
      ""
    ) // Remove question words
    .replace(/the|a|an|and|or|but|in|on|at|to|for|of|with|from/gi, "") // Remove common words
    .trim();

  // Split into words and filter
  const words = cleaned
    .split(/\s+/)
    .filter((word) => word.length > 2) // Only words longer than 2 chars
    .filter(
      (word) =>
        ![
          "what",
          "where",
          "when",
          "who",
          "how",
          "why",
          "which",
          "does",
          "did",
          "can",
          "could",
          "would",
          "should",
        ].includes(word)
    )
    .slice(0, 3); // Take first 3 meaningful words

  return words.join(" ").trim() || "education learning";
}

/**
 * Check if a card should get an image
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
