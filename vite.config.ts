/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,             // allows describe/test/expect globally
    environment: 'jsdom',      // simulates the browser
    setupFiles: './vitest.setup.ts',  // ✅ points to the file above
  },
})
