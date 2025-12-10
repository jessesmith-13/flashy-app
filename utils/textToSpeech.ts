import { DECK_LANGUAGES } from './languages'
import * as api from './api'

// TTS Provider type
export type TTSProvider = 'browser' | 'openai'

// Store for current audio element (for OpenAI TTS)
let currentAudio: HTMLAudioElement | null = null

// Map language names to language codes for speech synthesis
const getLanguageCode = (languageName?: string): string => {
  if (!languageName) return 'en-US' // Default to English
  
  const language = DECK_LANGUAGES.find(lang => lang.name === languageName)
  if (!language) return 'en-US'
  
  // Map language codes to speech synthesis locale codes
  const localeMap: { [key: string]: string } = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'ru': 'ru-RU',
    'ja': 'ja-JP',
    'zh': 'zh-CN',
    'ko': 'ko-KR',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'tr': 'tr-TR',
    'sv': 'sv-SE',
    'no': 'nb-NO',
    'da': 'da-DK',
    'fi': 'fi-FI',
    'el': 'el-GR',
    'he': 'he-IL',
    'th': 'th-TH',
    'vi': 'vi-VN',
    'id': 'id-ID',
    'cs': 'cs-CZ',
    'ro': 'ro-RO',
    'hu': 'hu-HU',
    'uk': 'uk-UA',
    'mixed': 'en-US',
    'other': 'en-US',
  }
  
  return localeMap[language.code] || 'en-US'
}

// Find the best voice for a given language (Browser TTS)
const findVoiceForLanguage = (locale: string): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices()
  
  // Try to find an exact match (e.g., "en-US")
  let voice = voices.find(v => v.lang === locale)
  if (voice) return voice
  
  // Try to find a voice that starts with the language code (e.g., "en")
  const langCode = locale.split('-')[0]
  voice = voices.find(v => v.lang.startsWith(langCode))
  if (voice) return voice
  
  // Fall back to default voice
  return voices[0] || null
}

interface SpeakOptions {
  text: string
  language?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
  provider?: TTSProvider
  accessToken?: string
}

// Browser-based TTS (Free)
const speakWithBrowser = ({ text, language, onStart, onEnd, onError }: SpeakOptions) => {
  // Stop any ongoing speech
  window.speechSynthesis.cancel()
  
  if (!text || text.trim().length === 0) {
    onError?.()
    return { success: false, error: 'No text to read' }
  }
  
  // Check if speech synthesis is supported
  if (!('speechSynthesis' in window)) {
    onError?.()
    return { success: false, error: 'Text-to-speech is not supported in your browser' }
  }
  
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.9 // Slightly slower for better comprehension
  utterance.pitch = 1
  utterance.volume = 1
  
  // Set the language/voice
  const locale = getLanguageCode(language)
  utterance.lang = locale
  
  // Wait for voices to be loaded (some browsers load them asynchronously)
  const setVoice = () => {
    const voice = findVoiceForLanguage(locale)
    if (voice) {
      utterance.voice = voice
    }
  }
  
  // Voices might not be loaded yet
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true })
  } else {
    setVoice()
  }
  
  utterance.onstart = () => onStart?.()
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onError?.()
  
  window.speechSynthesis.speak(utterance)
  
  return { success: true }
}

// OpenAI-based TTS (Premium - requires API key and costs money)
const speakWithOpenAI = async ({ text, language, onStart, onEnd, onError, accessToken }: SpeakOptions) => {
  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  
  if (!text || text.trim().length === 0) {
    onError?.()
    return { success: false, error: 'No text to read' }
  }
  
  if (!accessToken) {
    onError?.()
    return { success: false, error: 'Authentication required for OpenAI TTS' }
  }
  
  try {
    onStart?.()
    
    // Call the server to generate speech
    const { audioData, format } = await api.generateTextToSpeech(accessToken, text, language)
    
    // Convert base64 to blob
    const byteCharacters = atob(audioData)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: `audio/${format}` })
    
    // Create audio URL
    const audioUrl = URL.createObjectURL(blob)
    
    // Create and play audio element
    currentAudio = new Audio(audioUrl)
    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      onEnd?.()
    }
    currentAudio.onerror = () => {
      URL.revokeObjectURL(audioUrl)
      onError?.()
    }
    
    await currentAudio.play()
    
    return { success: true }
  } catch (error) {
    console.error('OpenAI TTS error:', error)
    onError?.()
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate speech' 
    }
  }
}

// Main speak function that routes to the appropriate provider
export const speak = (options: SpeakOptions) => {
  const provider = options.provider || 'browser' // Default to browser TTS
  
  if (provider === 'openai') {
    return speakWithOpenAI(options)
  } else {
    return speakWithBrowser(options)
  }
}

export const stopSpeaking = () => {
  // Stop browser TTS
  window.speechSynthesis.cancel()
  
  // Stop OpenAI audio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
}
