/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use jsdom to provide browser APIs in Node.js environment
    environment: 'jsdom',
    // Exclude patterns
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Include patterns for tests
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
