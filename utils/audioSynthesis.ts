/**
 * Web Audio API utilities for generating musical sounds
 */

// Note frequency mapping (in Hz)
const NOTE_FREQUENCIES: Record<string, number> = {
  // Octave 3
  C3: 130.81,
  "C#3": 138.59,
  Db3: 138.59,
  D3: 146.83,
  "D#3": 155.56,
  Eb3: 155.56,
  E3: 164.81,
  F3: 174.61,
  "F#3": 185.0,
  Gb3: 185.0,
  G3: 196.0,
  "G#3": 207.65,
  Ab3: 207.65,
  A3: 220.0,
  "A#3": 233.08,
  Bb3: 233.08,
  B3: 246.94,

  // Octave 4 (Middle octave)
  C4: 261.63,
  "C#4": 277.18,
  Db4: 277.18,
  D4: 293.66,
  "D#4": 311.13,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  Gb4: 369.99,
  G4: 392.0,
  "G#4": 415.3,
  Ab4: 415.3,
  A4: 440.0, // Standard tuning
  "A#4": 466.16,
  Bb4: 466.16,
  B4: 493.88,

  // Octave 5
  C5: 523.25,
  "C#5": 554.37,
  Db5: 554.37,
  D5: 587.33,
  "D#5": 622.25,
  Eb5: 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  Gb5: 739.99,
  G5: 783.99,
  "G#5": 830.61,
  Ab5: 830.61,
  A5: 880.0,
  "A#5": 932.33,
  Bb5: 932.33,
  B5: 987.77,
};

// Chord definitions (intervals from root note)
const CHORD_INTERVALS: Record<string, number[]> = {
  // 3-note triads
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],

  // 4-note chords (7th chords and extensions)
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  halfdiminished7: [0, 3, 6, 10], // ✅ NEW: m7♭5
  augmented7: [0, 4, 8, 10], // ✅ NEW
  "6": [0, 4, 7, 9], // ✅ NEW: Major 6th
  minor6: [0, 3, 7, 9], // ✅ NEW: Minor 6th
  add9: [0, 4, 7, 14], // ✅ NEW: Major add9
  minoradd9: [0, 3, 7, 14], // ✅ NEW: Minor add9

  // 5-note chords (9th chords and beyond)
  "9": [0, 4, 7, 10, 14], // ✅ NEW: Dominant 9th
  major9: [0, 4, 7, 11, 14], // ✅ NEW: Major 9th
  minor9: [0, 3, 7, 10, 14], // ✅ NEW: Minor 9th
  add11: [0, 4, 7, 14, 17], // ✅ NEW: Add11 (with 9th)
  "11": [0, 4, 7, 10, 14, 17], // ✅ NEW: Dominant 11th (6 notes!)
  "13": [0, 4, 7, 10, 14, 21], // ✅ NEW: Dominant 13th (6 notes!)
};

/**
 * Create and configure an AudioContext
 */
export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

/**
 * Play a single note
 */
export function playNote(
  audioContext: AudioContext,
  frequency: number,
  duration: number = 1,
  waveType: OscillatorType = "sine",
  volume: number = 0.3
): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = waveType;

  // ADSR envelope (simplified)
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Attack
  gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, now + 0.1); // Decay
  gainNode.gain.setValueAtTime(volume * 0.7, now + duration - 0.1); // Sustain
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Play a chord (multiple notes simultaneously)
 */
export function playChord(
  audioContext: AudioContext,
  frequencies: number[],
  duration: number = 2,
  waveType: OscillatorType = "sine",
  volume: number = 0.2
): void {
  frequencies.forEach((frequency) => {
    playNote(audioContext, frequency, duration, waveType, volume);
  });
}

/**
 * Get frequency for a note name (e.g., "A4", "C#5", "Db4")
 * ✅ FIX: Properly normalize case - first letter uppercase, accidental/octave as-is
 */
export function getNoteFrequency(noteName: string): number | null {
  if (!noteName) return null;

  // Normalize: first letter uppercase, keep rest as-is for now
  let normalized = noteName.charAt(0).toUpperCase() + noteName.slice(1);

  // Then ensure accidentals and octave are lowercase (except the octave number)
  // Pattern: C#4 or Db5 → first char uppercase, #/b lowercase, digit as-is
  normalized = normalized.replace(
    /^([A-G])([#Bb]?)(\d)$/i,
    (match, note, accidental, octave) => {
      return note.toUpperCase() + accidental.toLowerCase() + octave;
    }
  );

  console.log(
    `🔍 getNoteFrequency("${noteName}") → normalized to "${normalized}"`
  );

  const frequency = NOTE_FREQUENCIES[normalized];

  if (!frequency) {
    console.error(
      `❌ Frequency not found for "${normalized}". Available keys:`,
      Object.keys(NOTE_FREQUENCIES).filter((k) =>
        k.startsWith(noteName.charAt(0).toUpperCase())
      )
    );
  } else {
    console.log(`✅ Found frequency: ${frequency} Hz`);
  }

  return frequency || null;
}

/**
 * Get frequencies for a chord
 */
export function getChordFrequencies(
  rootNote: string,
  chordType: string = "major"
): number[] | null {
  const rootFrequency = getNoteFrequency(rootNote);
  if (!rootFrequency) return null;

  const intervals =
    CHORD_INTERVALS[chordType.toLowerCase()] || CHORD_INTERVALS["major"];

  // Calculate frequencies for each note in the chord
  return intervals.map((semitones) => {
    // Frequency ratio for semitone is 2^(1/12)
    return rootFrequency * Math.pow(2, semitones / 12);
  });
}

/**
 * Extract chord notation from [CHORD_AUDIO:notation] format
 * Returns: { chordNotation, displayText } or null if not in this format
 */
export function extractChordAudioNotation(text: string): {
  chordNotation: string;
  displayText: string;
} | null {
  if (!text) return null;
  const match = text.match(/^\[CHORD_AUDIO:([^\]]+)\]\s*(.+)$/i);
  if (!match) return null;

  return {
    chordNotation: match[1].trim(),
    displayText: match[2].trim(),
  };
}

/**
 * Parse a note/chord request from text
 * Examples: "A4", "C major", "D minor chord", "C7", "Dm7", "Cadd9", "Gmaj9", "[CHORD_AUDIO:Cmaj7] What kind of chord is this?"
 */
export function parseMusicRequest(text: string): {
  type: "note" | "chord";
  root: string;
  chordType?: string;
} | null {
  if (!text) return null;

  // Check if this is a [CHORD_AUDIO:notation] format
  const chordAudioExtract = extractChordAudioNotation(text);
  if (chordAudioExtract) {
    // Parse the extracted chord notation
    return parseMusicRequest(chordAudioExtract.chordNotation);
  }

  const normalized = text.trim().toLowerCase();

  // Priority 1: Chord shorthand with numbers (e.g., "C7", "Dm7", "Gmaj7", "Cadd9", "C9", "C11", "Cm7b5")
  const shorthandPattern =
    /\b([a-g][#b]?)(m|maj|min|dim|aug|sus|add)?(6|7|9|11|13)?(b5|#5)?(\s+chord)?\b/i;
  const shorthandMatch = normalized.match(shorthandPattern);

  if (shorthandMatch) {
    const root = shorthandMatch[1].toUpperCase();
    const modifier = (shorthandMatch[2] || "").toLowerCase();
    const extension = shorthandMatch[3];
    const alteration = (shorthandMatch[4] || "").toLowerCase(); // NEW: capture b5, #5

    let chordType = "major";

    // Handle add9, add11
    if (modifier === "add") {
      if (extension === "9") {
        chordType = "add9";
      } else if (extension === "11") {
        chordType = "add11";
      } else {
        chordType = "major"; // Default if no extension specified
      }
    }
    // Handle 7th chords WITH alterations (e.g., m7b5 = half diminished)
    else if (extension === "7") {
      if (alteration === "b5" && (modifier === "m" || modifier === "min")) {
        chordType = "halfdiminished7"; // ✅ m7b5 = half diminished 7th
      } else if (modifier === "m" || modifier === "min") {
        chordType = "minor7";
      } else if (modifier === "maj") {
        chordType = "major7";
      } else if (modifier === "dim") {
        chordType = "diminished7";
      } else if (modifier === "aug") {
        chordType = "augmented7";
      } else {
        chordType = "dominant7";
      }
    }
    // Handle 9th chords
    else if (extension === "9") {
      if (modifier === "m" || modifier === "min") {
        chordType = "minor9";
      } else if (modifier === "maj") {
        chordType = "major9";
      } else {
        chordType = "9"; // Dominant 9
      }
    }
    // Handle 11th chords
    else if (extension === "11") {
      chordType = "11";
    }
    // Handle 13th chords
    else if (extension === "13") {
      chordType = "13";
    }
    // Handle 6th chords
    else if (extension === "6") {
      chordType = modifier === "m" || modifier === "min" ? "minor6" : "6";
    }
    // Handle modifiers without extensions
    else {
      if (modifier === "dim") chordType = "diminished";
      if (modifier === "aug") chordType = "augmented";
      if (modifier === "sus") chordType = "sus4"; // Default sus to sus4
      if (modifier === "m" || modifier === "min") chordType = "minor";
    }

    const rootWithOctave = root + "4";
    return { type: "chord", root: rootWithOctave, chordType };
  }

  // Priority 2: Full chord names (e.g., "C major", "D minor chord", "E# major chord", "C add9")
  const chordPattern =
    /\b([a-g][#b]?[0-9]?)\s+(major9|minor9|major7|minor7|dominant7|diminished7|halfdiminished7|augmented7|minoradd9|add9|add11|major6|minor6|major|minor|diminished|augmented|dom7|maj7|min7|sus2|sus4|6|9|11|13)(\s+chord)?\b/i;
  const chordMatch = normalized.match(chordPattern);

  if (chordMatch) {
    const root = chordMatch[1].toUpperCase();
    let chordType = chordMatch[2].toLowerCase();

    // Normalize chord type aliases
    if (chordType === "maj7") chordType = "major7";
    if (chordType === "min7") chordType = "minor7";
    if (chordType === "dom7") chordType = "dominant7";

    // Add octave if not present
    const rootWithOctave = /[0-9]/.test(root) ? root : root + "4";

    return { type: "chord", root: rootWithOctave, chordType };
  }

  // Priority 3: Single note (e.g., "A4", "C# note")
  const notePattern = /\b([a-g][#b]?[0-9]?)(\s+note)?\b/i;
  const noteMatch = normalized.match(notePattern);

  if (noteMatch) {
    const root = noteMatch[1].toUpperCase();
    const rootWithOctave = /[0-9]/.test(root) ? root : root + "4";

    return { type: "note", root: rootWithOctave };
  }

  return null;
}

/**
 * Play music based on a text request
 */
export function playMusicFromRequest(text: string): boolean {
  const request = parseMusicRequest(text);
  if (!request) return false;

  const audioContext = createAudioContext();

  if (request.type === "note") {
    const frequency = getNoteFrequency(request.root);
    if (frequency) {
      playNote(audioContext, frequency, 1.5);
      return true;
    }
  } else if (request.type === "chord") {
    const frequencies = getChordFrequencies(
      request.root,
      request.chordType || "major"
    );
    if (frequencies) {
      playChord(audioContext, frequencies, 2);
      return true;
    }
  }

  return false;
}

/**
 * Generate a downloadable audio file from a note or chord
 */
export async function generateAudioFile(
  text: string,
  duration: number = 2
): Promise<Blob | null> {
  const request = parseMusicRequest(text);
  if (!request) return null;

  // Create offline audio context for rendering
  const sampleRate = 44100;
  const offlineContext = new OfflineAudioContext(
    1,
    sampleRate * duration,
    sampleRate
  );

  if (request.type === "note") {
    const frequency = getNoteFrequency(request.root);
    if (!frequency) return null;

    const oscillator = offlineContext.createOscillator();
    const gainNode = offlineContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(offlineContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    // Envelope
    gainNode.gain.setValueAtTime(0, 0);
    gainNode.gain.linearRampToValueAtTime(0.3, 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.2, 0.1);
    gainNode.gain.setValueAtTime(0.2, duration - 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, duration);

    oscillator.start(0);
    oscillator.stop(duration);
  } else if (request.type === "chord") {
    const frequencies = getChordFrequencies(
      request.root,
      request.chordType || "major"
    );
    if (!frequencies) return null;

    frequencies.forEach((frequency) => {
      const oscillator = offlineContext.createOscillator();
      const gainNode = offlineContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(offlineContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      // Envelope
      gainNode.gain.setValueAtTime(0, 0);
      gainNode.gain.linearRampToValueAtTime(0.2, 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.14, 0.1);
      gainNode.gain.setValueAtTime(0.14, duration - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, duration);

      oscillator.start(0);
      oscillator.stop(duration);
    });
  }

  // Render audio
  const audioBuffer = await offlineContext.startRendering();

  // Convert to WAV
  const wavBlob = audioBufferToWav(audioBuffer);
  return wavBlob;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // "RIFF" chunk descriptor
  setUint32(0x46464952); // "RIFF"
  setUint32(36 + length); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // "fmt " sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // length = 16
  setUint16(1); // PCM format
  setUint16(audioBuffer.numberOfChannels);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * audioBuffer.numberOfChannels * 2); // byte rate
  setUint16(audioBuffer.numberOfChannels * 2); // block align
  setUint16(16); // bits per sample

  // "data" sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(length);

  // Write audio samples
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (pos < buffer.byteLength) {
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      let sample = channels[i][offset];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
