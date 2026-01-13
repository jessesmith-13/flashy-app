/**
 * Utility functions for handling music chord text formatting
 */

/**
 * Extract and format text with [CHORD_AUDIO:notation] prefix
 * Returns the display text without the audio notation prefix
 *
 * @param text - The card text (e.g., "[CHORD_AUDIO:Cmaj7] What kind of chord is this?")
 * @returns Display text only (e.g., "What kind of chord is this?")
 *
 * @example
 * getDisplayText("[CHORD_AUDIO:Cmaj7] What kind of chord is this?")
 * // Returns: "What kind of chord is this?"
 *
 * getDisplayText("Cmaj7 chord")
 * // Returns: "Cmaj7 chord" (unchanged if no prefix)
 */
export function getDisplayText(text: string): string {
  if (!text) return text;

  // Check for [CHORD_AUDIO:notation] format
  const match = text.match(/^\[CHORD_AUDIO:([^\]]+)\]\s*(.+)$/i);

  if (match) {
    // Return only the display text part (after the prefix)
    return match[2].trim();
  }

  // No prefix found, return original text
  return text;
}

/**
 * Extract the chord notation from [CHORD_AUDIO:notation] format
 * Returns null if not in this format
 *
 * @param text - The card text
 * @returns Chord notation (e.g., "Cmaj7") or null
 *
 * @example
 * getChordNotation("[CHORD_AUDIO:Cmaj7] What kind of chord is this?")
 * // Returns: "Cmaj7"
 *
 * getChordNotation("Cmaj7 chord")
 * // Returns: null
 */
export function getChordNotation(text: string): string | null {
  if (!text) return null;

  const match = text.match(/^\[CHORD_AUDIO:([^\]]+)\]/i);

  if (match) {
    return match[1].trim();
  }

  return null;
}

/**
 * Check if text contains [CHORD_AUDIO:notation] format
 *
 * @param text - The card text
 * @returns true if text has CHORD_AUDIO prefix
 */
export function hasChordAudioPrefix(text: string): boolean {
  return /^\[CHORD_AUDIO:[^\]]+\]/.test(text);
}
