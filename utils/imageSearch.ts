/**
 * Image Search Utilities for AI-Generated Cards
 * Uses Unsplash to find relevant images based on card content
 */

/**
 * Extract meaningful keywords from card content
 * Prioritizes nouns, proper nouns, and key concepts
 */
export function extractKeywords(
  text: string,
  maxKeywords: number = 3
): string[] {
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
    );

  // Take first N meaningful words
  return words.slice(0, maxKeywords);
}

/**
 * Build search query from card content
 */
export function buildSearchQuery(front: string, back?: string): string {
  // Try to extract from front first
  let keywords = extractKeywords(front, 2);

  // If we didn't get enough keywords, try back
  if (keywords.length < 2 && back) {
    const backKeywords = extractKeywords(back, 2);
    keywords = [...keywords, ...backKeywords].slice(0, 3);
  }

  // Remove duplicates and join
  const uniqueKeywords = [...new Set(keywords)];
  return uniqueKeywords.join(" ").trim() || "education learning";
}

/**
 * Determine if a card should get an image
 * Some content types benefit more from images than others
 */
export function shouldAddImage(front: string, back: string): boolean {
  const combinedText = `${front} ${back}`.toLowerCase();

  // Skip images for very short text (likely just numbers/symbols)
  if (combinedText.replace(/\s/g, "").length < 10) {
    return false;
  }

  // Skip images for purely mathematical/technical content
  if (/^[\d\s+\-*/=()]+$/.test(combinedText)) {
    return false;
  }

  // Skip images for music chords/notes (they use audio instead)
  if (
    /(major|minor|diminished|augmented|chord|note|c#|d#|e#|f#|g#|a#|b#)/i.test(
      combinedText
    )
  ) {
    return false;
  }

  return true;
}
