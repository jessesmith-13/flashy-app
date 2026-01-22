/**
 * Music chord instructions for AI flashcard generation
 * This ensures proper 4+ note chord generation with correct audio matching
 */

export const MUSIC_CHORD_INSTRUCTION_CLASSIC_FLIP = `

SPECIAL: MUSIC CHORDS - When creating flashcards about musical chords:

FOR CHORD IDENTIFICATION (user guesses chord type from sound):
- FRONT: Specific chord with FULL chord notation including extensions
- BACK: Full chord type description

🎵 CHORD TYPES - DETECT FROM USER REQUEST:

3-NOTE TRIADS (use ONLY if user asks for basic chords/triads):
  • Front: "C major chord" → Back: "Major triad"
  • Front: "D minor chord" → Back: "Minor triad"
  • Front: "E diminished chord" → Back: "Diminished triad"

4-NOTE CHORDS (USE when user mentions "4-note", "7th chords", or "extended chords"):
  • Front: "Cmaj7 chord" → Back: "Major 7th"
  • Front: "Dm7 chord" → Back: "Minor 7th"
  • Front: "G7 chord" → Back: "Dominant 7th"
  • Front: "Bdim7 chord" → Back: "Diminished 7th"
  • Front: "C6 chord" → Back: "Major 6th"
  • Front: "Cadd9 chord" → Back: "Major add9"

5-NOTE CHORDS (USE when user asks for "9th chords" or "complex chords"):
  • Front: "Cmaj9 chord" → Back: "Major 9th"
  • Front: "Dm9 chord" → Back: "Minor 9th"
  • Front: "G9 chord" → Back: "Dominant 9th"

⚠️ CRITICAL RULES:
1. When user asks for "4-note chords" or "7th chords", generate ONLY 4-note chords (maj7, m7, 7, dim7, etc.)
2. ALWAYS include the full chord extension in the FRONT (e.g., "Cmaj7 chord" NOT "C major chord")
3. The BACK must match the FRONT (if Front="Cmaj7 chord", Back="Major 7th" NOT "Major triad")
4. Audio will be generated for the FRONT based on the chord notation - NO audio on BACK

FOR CHORD LEARNING:
- FRONT: "What notes make up a Cmaj7 chord?"
- BACK: "Cmaj7" or "C, E, G, B"

DO NOT list individual notes (C, E, G) as separate unrelated cards - create chord-focused cards instead`;

export const MUSIC_CHORD_INSTRUCTION_TYPE_ANSWER = `

SPECIAL: MUSIC CHORDS - When creating flashcards about musical chords:

FOR CHORD IDENTIFICATION (user guesses chord type from sound):
- FRONT: Specific chord with FULL chord notation including extensions
- BACK: Full chord type description (what user types)
- acceptedAnswers: Include variations of the chord type

🎵 CHORD TYPES - DETECT FROM USER REQUEST:

3-NOTE TRIADS (use ONLY if user asks for basic chords/triads):
  • Front: "C major chord" → Back: "Major triad" → acceptedAnswers: ["Major triad", "major triad", "Major", "major"]
  • Front: "D minor chord" → Back: "Minor triad" → acceptedAnswers: ["Minor triad", "minor triad", "Minor", "minor"]

4-NOTE CHORDS (USE when user mentions "4-note", "7th chords", or "extended chords"):
  • Front: "Cmaj7 chord" → Back: "Major 7th" → acceptedAnswers: ["Major 7th", "major 7th", "Major seventh", "maj7"]
  • Front: "Dm7 chord" → Back: "Minor 7th" → acceptedAnswers: ["Minor 7th", "minor 7th", "Minor seventh", "m7"]
  • Front: "G7 chord" → Back: "Dominant 7th" → acceptedAnswers: ["Dominant 7th", "dominant 7th", "Dominant seventh", "7"]
  • Front: "Bdim7 chord" → Back: "Diminished 7th" → acceptedAnswers: ["Diminished 7th", "diminished 7th", "dim7"]

5-NOTE CHORDS (USE when user asks for "9th chords" or "complex chords"):
  • Front: "Cmaj9 chord" → Back: "Major 9th" → acceptedAnswers: ["Major 9th", "major 9th", "Major ninth", "maj9"]
  • Front: "G9 chord" → Back: "Dominant 9th" → acceptedAnswers: ["Dominant 9th", "dominant 9th", "9"]

⚠️ CRITICAL RULES:
1. When user asks for "4-note chords" or "7th chords", generate ONLY 4-note chords (maj7, m7, 7, dim7, etc.)
2. ALWAYS include the full chord extension in the FRONT (e.g., "Cmaj7 chord" NOT "C major chord")
3. The BACK must match the FRONT (if Front="Cmaj7 chord", Back="Major 7th" NOT "Major triad")
4. Audio will be generated for the FRONT - NO audio on BACK
5. Include acceptedAnswers with case variations and common abbreviations

FOR CHORD LEARNING:
- FRONT: "What notes make up a Cmaj7 chord?"
- BACK: "Cmaj7" or "C, E, G, B"

DO NOT list individual notes (C, E, G) as separate unrelated cards - create chord-focused cards instead`;

export const MUSIC_CHORD_INSTRUCTION_MULTIPLE_CHOICE = `

SPECIAL: MUSIC CHORDS - When creating flashcards about musical chords:

FOR CHORD IDENTIFICATION (user guesses chord type from sound):
- FRONT: Specific chord with FULL chord notation including extensions (e.g., "Cmaj7 chord", "Dm7 chord", "G7 chord")
- correctAnswers: Array with the correct chord type
- incorrectAnswers: Array with 3 plausible but INCORRECT chord types

🎵 CHORD TYPES - DETECT FROM USER REQUEST:

3-NOTE TRIADS (use ONLY if user asks for basic chords/triads):
  • Front: "C major chord" → correctAnswers: ["Major triad"] → incorrectAnswers: ["Minor triad", "Diminished triad", "Augmented triad"]
  • Front: "D minor chord" → correctAnswers: ["Minor triad"] → incorrectAnswers: ["Major triad", "Diminished triad", "Augmented triad"]

4-NOTE CHORDS (USE when user mentions "4-note", "7th chords", or "extended chords"):
  • Front: "Cmaj7 chord" → correctAnswers: ["Major 7th"] → incorrectAnswers: ["Minor 7th", "Dominant 7th", "Diminished 7th"]
  • Front: "Dm7 chord" → correctAnswers: ["Minor 7th"] → incorrectAnswers: ["Major 7th", "Dominant 7th", "Half-diminished 7th"]
  • Front: "G7 chord" → correctAnswers: ["Dominant 7th"] → incorrectAnswers: ["Major 7th", "Minor 7th", "Diminished 7th"]
  • Front: "Bdim7 chord" → correctAnswers: ["Diminished 7th"] → incorrectAnswers: ["Half-diminished 7th", "Minor 7th", "Dominant 7th"]

5-NOTE CHORDS (USE when user asks for "9th chords" or "complex chords"):
  • Front: "Cmaj9 chord" → correctAnswers: ["Major 9th"] → incorrectAnswers: ["Minor 9th", "Dominant 9th", "Major 7th"]
  • Front: "G9 chord" → correctAnswers: ["Dominant 9th"] → incorrectAnswers: ["Major 9th", "Minor 9th", "Dominant 7th"]

⚠️ CRITICAL RULES:
1. When user asks for "4-note chords" or "7th chords", generate ONLY 4-note chords (maj7, m7, 7, dim7, etc.)
2. ALWAYS include the full chord extension in the FRONT (e.g., "Cmaj7 chord" NOT "C major chord")
3. The correctAnswers must match the FRONT (if Front="Cmaj7 chord", correctAnswers=["Major 7th"] NOT ["Major triad"])
4. Audio will be generated for the FRONT based on the chord notation
5. Make incorrectAnswers PLAUSIBLE - use other 7th chord types for 4-note chords, other triads for triads

FOR CHORD LEARNING:
- FRONT: "What notes make up a Cmaj7 chord?"
- correctAnswers: ["C, E, G, B"] or ["Cmaj7"]
- incorrectAnswers: Other note combinations

DO NOT list individual notes (C, E, G) as separate unrelated cards - create chord-focused cards instead`;
