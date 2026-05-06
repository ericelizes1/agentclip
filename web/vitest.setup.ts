import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto-cleanup the DOM between tests so a previous test's render
// can't leak nodes into the next test's assertions.
afterEach(() => {
  cleanup()
})
