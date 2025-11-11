// vitest.setup.ts
import { vi, beforeAll, afterAll } from 'vitest'
import '@testing-library/jest-dom'

// ✅ Example: silence console logs in tests
beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

// ✅ Example: clean up mocks
afterAll(() => {
  vi.restoreAllMocks()
})
