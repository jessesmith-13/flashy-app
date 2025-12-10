/**
 * Web Audio API utilities for generating musical sounds
 */

// Note frequency mapping (in Hz)
const NOTE_FREQUENCIES: Record<string, number> = {
  // Octave 3
  'C3': 130.81,
  'C#3': 138.59,
  'Db3': 138.59,
  'D3': 146.83,
  'D#3': 155.56,
  'Eb3': 155.56,
  'E3': 164.81,
  'F3': 174.61,
  'F#3': 185.00,
  'Gb3': 185.00,
  'G3': 196.00,
  'G#3': 207.65,
  'Ab3': 207.65,
  'A3': 220.00,
  'A#3': 233.08,
  'Bb3': 233.08,
  'B3': 246.94,
  
  // Octave 4 (Middle octave)
  'C4': 261.63,
  'C#4': 277.18,
  'Db4': 277.18,
  'D4': 293.66,
  'D#4': 311.13,
  'Eb4': 311.13,
  'E4': 329.63,
  'F4': 349.23,
  'F#4': 369.99,
  'Gb4': 369.99,
  'G4': 392.00,
  'G#4': 415.30,
  'Ab4': 415.30,
  'A4': 440.00, // Standard tuning
  'A#4': 466.16,
  'Bb4': 466.16,
  'B4': 493.88,
  
  // Octave 5
  'C5': 523.25,
  'C#5': 554.37,
  'Db5': 554.37,
  'D5': 587.33,
  'D#5': 622.25,
  'Eb5': 622.25,
  'E5': 659.25,
  'F5': 698.46,
  'F#5': 739.99,
  'Gb5': 739.99,
  'G5': 783.99,
  'G#5': 830.61,
  'Ab5': 830.61,
  'A5': 880.00,
  'A#5': 932.33,
  'Bb5': 932.33,
  'B5': 987.77,
}

// Chord definitions (intervals from root note)
const CHORD_INTERVALS: Record<string, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'diminished': [0, 3, 6],
  'augmented': [0, 4, 8],
  'major7': [0, 4, 7, 11],
  'minor7': [0, 3, 7, 10],
  'dominant7': [0, 4, 7, 10],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
}

/**
 * Create and configure an AudioContext
 */
export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}

/**
 * Play a single note
 */
export function playNote(
  audioContext: AudioContext,
  frequency: number,
  duration: number = 1,
  waveType: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.value = frequency
  oscillator.type = waveType
  
  // ADSR envelope (simplified)
  const now = audioContext.currentTime
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.01) // Attack
  gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, now + 0.1) // Decay
  gainNode.gain.setValueAtTime(volume * 0.7, now + duration - 0.1) // Sustain
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration) // Release
  
  oscillator.start(now)
  oscillator.stop(now + duration)
}

/**
 * Play a chord (multiple notes simultaneously)
 */
export function playChord(
  audioContext: AudioContext,
  frequencies: number[],
  duration: number = 2,
  waveType: OscillatorType = 'sine',
  volume: number = 0.2
): void {
  frequencies.forEach(frequency => {
    playNote(audioContext, frequency, duration, waveType, volume)
  })
}

/**
 * Get frequency for a note name (e.g., "A4", "C#5")
 */
export function getNoteFrequency(noteName: string): number | null {
  return NOTE_FREQUENCIES[noteName.toUpperCase()] || null
}

/**
 * Get frequencies for a chord
 */
export function getChordFrequencies(rootNote: string, chordType: string = 'major'): number[] | null {
  const rootFrequency = getNoteFrequency(rootNote)
  if (!rootFrequency) return null
  
  const intervals = CHORD_INTERVALS[chordType.toLowerCase()] || CHORD_INTERVALS['major']
  
  // Calculate frequencies for each note in the chord
  return intervals.map(semitones => {
    // Frequency ratio for semitone is 2^(1/12)
    return rootFrequency * Math.pow(2, semitones / 12)
  })
}

/**
 * Parse a note/chord request from text
 * Examples: "A4", "C major", "D minor chord", "G#5 note"
 */
export function parseMusicRequest(text: string): {
  type: 'note' | 'chord'
  root: string
  chordType?: string
} | null {
  const normalized = text.trim().toLowerCase()
  
  // Check for chord patterns - MUST have a note letter (A-G) at the start
  // This prevents matching standalone words like "major" or "minor" without a note
  const chordPattern = /\b([a-g][#b]?[0-9]?)\s*(major|minor|diminished|augmented|maj7|min7|dom7|sus2|sus4|m|M)(\s+chord)?\b/i
  const chordMatch = normalized.match(chordPattern)
  
  if (chordMatch && chordMatch[2]) {
    const root = chordMatch[1].toUpperCase()
    let chordType = chordMatch[2]
    
    // Normalize chord type
    if (chordType === 'm') chordType = 'minor'
    if (chordType === 'M') chordType = 'major'
    if (chordType === 'maj7') chordType = 'major7'
    if (chordType === 'min7') chordType = 'minor7'
    if (chordType === 'dom7') chordType = 'dominant7'
    
    // Add octave if not present
    const rootWithOctave = /[0-9]/.test(root) ? root : root + '4'
    
    return { type: 'chord', root: rootWithOctave, chordType }
  }
  
  // Check for note pattern - MUST have note letter
  const notePattern = /\b([a-g][#b]?[0-9]?)(\s+note)?\b/i
  const noteMatch = normalized.match(notePattern)
  
  if (noteMatch) {
    const root = noteMatch[1].toUpperCase()
    // Add octave if not present
    const rootWithOctave = /[0-9]/.test(root) ? root : root + '4'
    
    return { type: 'note', root: rootWithOctave }
  }
  
  return null
}

/**
 * Play music based on a text request
 */
export function playMusicFromRequest(text: string): boolean {
  const request = parseMusicRequest(text)
  if (!request) return false
  
  const audioContext = createAudioContext()
  
  if (request.type === 'note') {
    const frequency = getNoteFrequency(request.root)
    if (frequency) {
      playNote(audioContext, frequency, 1.5)
      return true
    }
  } else if (request.type === 'chord') {
    const frequencies = getChordFrequencies(request.root, request.chordType || 'major')
    if (frequencies) {
      playChord(audioContext, frequencies, 2)
      return true
    }
  }
  
  return false
}

/**
 * Generate a downloadable audio file from a note or chord
 */
export async function generateAudioFile(
  text: string,
  duration: number = 2
): Promise<Blob | null> {
  const request = parseMusicRequest(text)
  if (!request) return null
  
  // Create offline audio context for rendering
  const sampleRate = 44100
  const offlineContext = new OfflineAudioContext(1, sampleRate * duration, sampleRate)
  
  if (request.type === 'note') {
    const frequency = getNoteFrequency(request.root)
    if (!frequency) return null
    
    const oscillator = offlineContext.createOscillator()
    const gainNode = offlineContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(offlineContext.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    
    // Envelope
    gainNode.gain.setValueAtTime(0, 0)
    gainNode.gain.linearRampToValueAtTime(0.3, 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.2, 0.1)
    gainNode.gain.setValueAtTime(0.2, duration - 0.1)
    gainNode.gain.exponentialRampToValueAtTime(0.01, duration)
    
    oscillator.start(0)
    oscillator.stop(duration)
  } else if (request.type === 'chord') {
    const frequencies = getChordFrequencies(request.root, request.chordType || 'major')
    if (!frequencies) return null
    
    frequencies.forEach(frequency => {
      const oscillator = offlineContext.createOscillator()
      const gainNode = offlineContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(offlineContext.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      
      // Envelope
      gainNode.gain.setValueAtTime(0, 0)
      gainNode.gain.linearRampToValueAtTime(0.2, 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.14, 0.1)
      gainNode.gain.setValueAtTime(0.14, duration - 0.1)
      gainNode.gain.exponentialRampToValueAtTime(0.01, duration)
      
      oscillator.start(0)
      oscillator.stop(duration)
    })
  }
  
  // Render audio
  const audioBuffer = await offlineContext.startRendering()
  
  // Convert to WAV
  const wavBlob = audioBufferToWav(audioBuffer)
  return wavBlob
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const length = audioBuffer.length * audioBuffer.numberOfChannels * 2
  const buffer = new ArrayBuffer(44 + length)
  const view = new DataView(buffer)
  const channels = []
  let offset = 0
  let pos = 0
  
  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true)
    pos += 2
  }
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true)
    pos += 4
  }
  
  // "RIFF" chunk descriptor
  setUint32(0x46464952) // "RIFF"
  setUint32(36 + length) // file length - 8
  setUint32(0x45564157) // "WAVE"
  
  // "fmt " sub-chunk
  setUint32(0x20746d66) // "fmt "
  setUint32(16) // length = 16
  setUint16(1) // PCM format
  setUint16(audioBuffer.numberOfChannels)
  setUint32(audioBuffer.sampleRate)
  setUint32(audioBuffer.sampleRate * audioBuffer.numberOfChannels * 2) // byte rate
  setUint16(audioBuffer.numberOfChannels * 2) // block align
  setUint16(16) // bits per sample
  
  // "data" sub-chunk
  setUint32(0x61746164) // "data"
  setUint32(length)
  
  // Write audio samples
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i))
  }
  
  while (pos < buffer.byteLength) {
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      let sample = channels[i][offset]
      sample = Math.max(-1, Math.min(1, sample))
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      pos += 2
    }
    offset++
  }
  
  return new Blob([buffer], { type: 'audio/wav' })
}