import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useStore } from '../useStore'

describe('useStore', () => {
  beforeEach(() => {
    act(() => {
      useStore.getState().logout()
    })
  })

  it('sets authentication data correctly', () => {
    act(() => {
      useStore.getState().setAuth(
        { id: '1', email: 'test@flashy.app', name: 'Test User', subscriptionTier: 'free' },
        'fake_token'
      )
    })

    const state = useStore.getState()
    expect(state.user?.email).toBe('test@flashy.app')
    expect(state.accessToken).toBe('fake_token')
  })

  it('clears data on logout', () => {
    act(() => {
      useStore.getState().setAuth(
        { id: '1', email: 'x@x.com', name: 'X' },
        'token'
      )
      useStore.getState().logout()
    })

    const state = useStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('updates current view and section', () => {
    act(() => {
      useStore.getState().setCurrentView('community')
      useStore.getState().setCurrentSection('flashcards')
    })

    const state = useStore.getState()
    expect(state.currentView).toBe('community')
    expect(state.currentSection).toBe('flashcards')
  })
})
