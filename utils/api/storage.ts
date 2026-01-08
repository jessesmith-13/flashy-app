import { API_BASE } from '../supabase/info'

import { supabase } from '../../src/lib/supabase'
/**
 * ============================================================
 * STORAGE API
 * ============================================================
 */

/**
 * Upload user avatar
 */
export const uploadAvatar = async (
  accessToken: string,
  file: File
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/storage/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  const data: { url?: string; error?: string } = await response.json()

  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload avatar')
  }

  return data.url
}

/**
 * Upload card image (front/back)
 */
export const uploadCardImage = async (
  accessToken: string,
  file: File
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/storage/card-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  const data: { url?: string; error?: string } = await response.json()

  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload card image')
  }

  return data.url
}

/**
 * Upload card audio (TTS or recorded)
 *
 * NOTE:
 * This intentionally pulls the session internally since
 * audio uploads often happen outside standard form flows.
 */
export const uploadCardAudio = async (
  file: File
): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/storage/card-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  const data: { url?: string; error?: string } = await response.json()

  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload card audio')
  }

  return data.url
}