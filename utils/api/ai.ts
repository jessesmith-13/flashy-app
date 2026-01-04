import { AI_API_BASE } from '../supabase/info'
import { createClient } from '@supabase/supabase-js'
import { publicAnonKey, projectId } from '../supabase/info'
import type { GeneratedCardType } from '../../src/types/ai'
import * as pdfjsLib from 'pdfjs-dist'

// Supabase client (used for session-based AI endpoints)
const supabaseClient = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
)

// Configure PDF.js worker - import from node_modules
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Vite will bundle this as an asset
  import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((workerSrc) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default
  })
  
  // Temporary workaround: use unpkg as fallback while the import resolves
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

/**
 * ============================================================
 * AI API
 * ============================================================
 */

/**
 * Generate cards using AI chat
 */
export const generateCardsWithAI = async (
  topic: string,
  numCards: number,
  cardTypes: {
    classicFlip: boolean
    multipleChoice: boolean
    typeAnswer: boolean
  } = { classicFlip: true, multipleChoice: false, typeAnswer: false },
  includeImages = false,
  difficulty = 'mixed',
  frontLanguage = '',
  backLanguage = ''
) => {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${AI_API_BASE}/ai/generate/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      topic,
      numCards: numCards.toString(),
      cardTypes,
      includeImages,
      difficulty,
      frontLanguage,
      backLanguage,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate cards with AI')
  }

  return data
}

/**
 * Generate cards from CSV file
 */
export const generateCardsFromCSV = async (
  accessToken: string,
  file: File
): Promise<{ cards: GeneratedCardType[] }> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${AI_API_BASE}/ai/generate/csv`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to import CSV')
  }

  return response.json()
}


/**
 * Extract text from PDF file using PDF.js
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    console.log(`📄 PDF loaded: ${pdf.numPages} pages`)

    // Extract text from all pages
    const textPromises: Promise<string>[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      textPromises.push(
        pdf.getPage(pageNum).then(async (page) => {
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
          return pageText
        })
      )
    }

    const pagesText = await Promise.all(textPromises)
    const fullText = pagesText.join('\n\n')

    console.log(`✅ Extracted ${fullText.length} characters from PDF`)

    return fullText
  } catch (error) {
    console.error('❌ PDF extraction error:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to extract text from PDF: ${error.message}`
        : 'Failed to extract text from PDF'
    )
  }
}

/**
 * Generate cards from PDF using client-side text extraction
 */
export const generateCardsFromPDF = async (
  file: File,
  numCards: number,
  customInstructions?: string,
  cardTypes?: {
    classicFlip: boolean
    multipleChoice: boolean
    typeAnswer: boolean
  },
  frontLanguage?: string,
  backLanguage?: string
) => {
  // Validate file
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Invalid file type. Only PDF files are allowed.')
  }

  if (file.size > 10_485_760) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  // Get auth token
  const { data: { session } } = await supabaseClient.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  // Step 1: Extract text from PDF in the browser
  console.log('📄 Extracting text from PDF...')
  const pdfText = await extractTextFromPDF(file)

  if (!pdfText.trim()) {
    throw new Error(
      'No text content found in PDF. The PDF may be scanned or image-based. Try using OCR software first.'
    )
  }

  // Truncate if too long (100k chars limit)
  let finalText = pdfText
  if (pdfText.length > 100_000) {
    finalText = pdfText.slice(0, 100_000)
    console.warn('⚠️ PDF text truncated to 100,000 characters')
  }

  // Step 2: Send extracted text to backend
  console.log('🤖 Sending text to AI for card generation...')
  const response = await fetch(`${AI_API_BASE}/ai/generate/pdf-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      pdfText: finalText,
      numCards,
      customInstructions,
      cardTypes,
      frontLanguage,
      backLanguage,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate cards from PDF')
  }

  console.log(`✅ Generated ${data.cards?.length || 0} cards from PDF`)

  return data
}

/**
 * Translate text using AI
 */
export const translateText = async (
  accessToken: string,
  text: string,
  targetLanguage: string
): Promise<{ translatedText: string }> => {
  const response = await fetch(`${AI_API_BASE}/ai/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, targetLanguage }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to translate text')
  }

  return response.json()
}

/**
 * Generate text-to-speech audio using AI
 */
export const generateTextToSpeech = async (
  accessToken: string,
  text: string,
  language?: string
): Promise<{ audioData: string; format: string }> => {
  const response = await fetch(`${AI_API_BASE}/ai/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, language }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to generate speech')
  }

  return response.json()
}