import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as api from '../api'
import { supabaseClient } from '../api'
import type { Session, AuthError } from '@supabase/supabase-js'

// ---------- Mock session ----------
const mockSession: Session = {
  access_token: 'mock_access_token',
  refresh_token: 'mock_refresh_token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user_123',
    email: 'test@flashy.app',
    app_metadata: {},
    user_metadata: { name: 'Test User' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
}

// ---------- Global setup ----------
beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  global.fetch = vi.fn() as unknown as typeof fetch
})

afterEach(() => {
  vi.clearAllMocks()
})

// ---------- Tests ----------

describe('api.signUp', () => {
  it('calls the signup endpoint and returns data on success', async () => {
    const mockResponse = { user: { id: '1', email: 'test@flashy.app' } }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response)

    const result = await api.signUp('test@flashy.app', '123456', 'Test User')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/signup/),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )

    expect(result).toEqual(mockResponse)
  })

  it('throws an error when the response is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Sign up failed' }),
    } as unknown as Response)

    await expect(api.signUp('bad', '123', 'x')).rejects.toThrow('Sign up failed')
  })
})

describe('api.signIn', () => {
  it('returns session and user data from Supabase', async () => {
    const signInMock = vi
      .spyOn(supabaseClient.auth, 'signInWithPassword')
      .mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      })

    const result = await api.signIn('test@flashy.app', '123456')

    expect(signInMock).toHaveBeenCalledWith({
      email: 'test@flashy.app',
      password: '123456',
    })

    expect(result.session.access_token).toBe('mock_access_token')
    expect(result.user.email).toBe('test@flashy.app')
  })

  it('throws when Supabase returns an error', async () => {
    vi.spyOn(supabaseClient.auth, 'signInWithPassword').mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' } as AuthError,
    })

    await expect(api.signIn('x@x.com', 'wrong')).rejects.toThrow('Invalid credentials')
  })
})

describe('api.signInWithGoogle', () => {
  it('calls Supabase OAuth with google provider', async () => {
    const mockFn = vi
      .spyOn(supabaseClient.auth, 'signInWithOAuth')
      .mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com' },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabaseClient.auth.signInWithOAuth>>)

    const result = await api.signInWithGoogle()

    expect(mockFn).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/v1/callback` },
    })
    expect(result.provider).toBe('google')
  })

  it('throws on error', async () => {
    vi.spyOn(supabaseClient.auth, 'signInWithOAuth').mockResolvedValue({
      data: null,
      error: { message: 'OAuth failed' } as AuthError,
    } as unknown as Awaited<ReturnType<typeof supabaseClient.auth.signInWithOAuth>>)

    await expect(api.signInWithGoogle()).rejects.toThrow('OAuth failed')
  })
})

describe('api.fetchDecks', () => {
  it('fetches decks successfully', async () => {
    const mockDecks = [{ id: '1', name: 'Biology Basics' }]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ decks: mockDecks }),
      headers: new Headers(),
    } as unknown as Response)

    const result = await api.fetchDecks('mock_access_token')

    expect(result).toEqual(mockDecks)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/decks/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock_access_token',
        }),
      })
    )
  })

  it('throws an error when server returns non-ok', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: 'Server error' }),
      headers: new Headers(),
    } as unknown as Response)

    await expect(api.fetchDecks('bad_token')).rejects.toThrow('Server error')
  })
})
